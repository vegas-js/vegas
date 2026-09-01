import path from "node:path";
import url from "node:url";

import { referenceCases } from "./cases";
import { createReferenceClient } from "./client";
import { compareReference } from "./compare";
import { loadOAuthConfig, loadReferenceConfig } from "./config";
import { acquireReferenceFixture } from "./fixture";
import { readReferenceFixture } from "./fixtureStore";
import { createAccessTokenProvider } from "./oauth";
import { computeCaseRevision, loadReferenceProjectFiles, updateReferenceProject } from "./project";

async function main(): Promise<void> {
  const referenceDir = url.fileURLToPath(new URL("../../reference/", import.meta.url));

  const config = loadReferenceConfig();
  const oauthConfig = loadOAuthConfig();

  const accessTokenProvider = createAccessTokenProvider(oauthConfig);

  const files = await loadReferenceProjectFiles(referenceDir);

  const caseRevision = computeCaseRevision(files);

  await updateReferenceProject(config, accessTokenProvider, files);

  let driftDetected = false;
  for (const referenceCase of referenceCases) {
    const client = createReferenceClient(config, accessTokenProvider);
    const actual = await acquireReferenceFixture(client, referenceCase.functionName, caseRevision);

    const expected = await readReferenceFixture(
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
