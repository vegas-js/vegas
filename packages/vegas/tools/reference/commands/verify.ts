import path from "node:path";
import url from "node:url";

import { referenceCases } from "../core/cases";
import { compareReference } from "../core/compare";
import { acquireReferenceResults, createReferenceMetadata } from "../core/fixture";
import { readReferenceResult, readReferenceMetadata } from "../fixtures/store";
import { createReferenceClient } from "../gas/client";
import { loadOAuthConfig, loadReferenceConfig } from "../gas/config";
import { createAccessTokenProvider } from "../gas/oauth";
import {
  computeCaseRevision,
  loadReferenceProjectFiles,
  updateReferenceProject,
} from "../gas/project";
import { createWebAppReferenceClient } from "../gas/webAppClient";

async function main(): Promise<void> {
  const referenceDir = url.fileURLToPath(new URL("../../../reference/", import.meta.url));

  const config = loadReferenceConfig();
  const oauthConfig = loadOAuthConfig();

  const accessTokenProvider = createAccessTokenProvider(oauthConfig);

  const files = await loadReferenceProjectFiles(referenceDir);

  const caseRevision = computeCaseRevision(files);
  const actualMetadata = createReferenceMetadata(caseRevision);

  await updateReferenceProject(config, accessTokenProvider, files);

  let driftDetected = false;

  const expectedMetadata = await readReferenceMetadata(path.join(referenceDir, "metadata.json"));
  const metadataComparison = compareReference(expectedMetadata, actualMetadata);

  if (!metadataComparison.equal) {
    driftDetected = true;

    console.error("Reference metadata drift detected");
    console.error(
      JSON.stringify(
        {
          expected: metadataComparison.expected,
          actual: metadataComparison.actual,
        },
        null,
        2,
      ),
    );
  }

  const client = createReferenceClient(config, accessTokenProvider);
  const acquirers = {
    executionApi: client,
    ...(config.webAppUrl === undefined
      ? {}
      : {
          webApp: createWebAppReferenceClient(config.webAppUrl),
        }),
  };
  const acquiredResults = await acquireReferenceResults(acquirers, referenceCases);

  for (const { referenceCase, result: actual } of acquiredResults) {
    const expected = await readReferenceResult(
      path.join(referenceDir, "fixtures", referenceCase.fixtureFile),
    );

    const comparison = compareReference(expected, actual);

    if (!comparison.equal) {
      driftDetected = true;

      console.error(`Reference drift detected: ${referenceCase.name}`);

      console.error(
        JSON.stringify(
          {
            expected: comparison.expected,
            actual: comparison.actual,
          },
          null,
          2,
        ),
      );
    }
  }

  if (driftDetected) {
    process.exitCode = 2;
  } else {
    console.log("All reference fixtures match.");
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));

  process.exitCode = 1;
}
