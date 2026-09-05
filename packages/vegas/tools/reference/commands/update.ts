import path from "node:path";
import url from "node:url";

import { referenceCases } from "../core/cases";
import { acquireReferenceResults, createReferenceMetadata } from "../core/fixture";
import { writeReferenceResult, writeReferenceMetadata } from "../fixtures/store";
import { createReferenceClient } from "../gas/client";
import { loadOAuthConfig, loadReferenceConfig } from "../gas/config";
import { ensureReferenceDeployment } from "../gas/deploymentRelease";
import { createAccessTokenProvider } from "../gas/oauth";
import {
  computeCaseRevision,
  loadReferenceProjectFiles,
  updateReferenceProject,
} from "../gas/project";
import { createWebAppReferenceClient } from "../gas/webAppClient";

function selectReferenceCases(requestedNames: readonly string[]) {
  if (requestedNames.length === 0) {
    return referenceCases;
  }

  const casesByName = new Map(
    referenceCases.map((referenceCase) => [referenceCase.name, referenceCase]),
  );

  return [...new Set(requestedNames)].map((name) => {
    const referenceCase = casesByName.get(name);

    if (referenceCase === undefined) {
      throw new Error(`Unknown reference case: ${name}`);
    }

    return referenceCase;
  });
}

const referenceDir = url.fileURLToPath(new URL("../../../reference/", import.meta.url));

const selectedReferenceCases = selectReferenceCases(
  process.argv.slice(2).filter((argument) => argument !== "--"),
);

const config = loadReferenceConfig();
const oauthConfig = loadOAuthConfig();
const accessTokenProvider = createAccessTokenProvider(oauthConfig);

const files = await loadReferenceProjectFiles(referenceDir);

const caseRevision = computeCaseRevision(files);
const metadata = createReferenceMetadata(caseRevision);

await updateReferenceProject(config, accessTokenProvider, files);
const client = createReferenceClient(config, accessTokenProvider);

const requiresWebApp = selectedReferenceCases.some(
  (referenceCase) => referenceCase.acquisition?.kind === "web-app",
);

const webAppUrl = requiresWebApp
  ? await ensureReferenceDeployment(config, accessTokenProvider, caseRevision)
  : undefined;

const acquirers = {
  executionApi: client,
  ...(webAppUrl === undefined
    ? {}
    : {
        webApp: createWebAppReferenceClient(webAppUrl, accessTokenProvider),
      }),
};

const acquiredResults = await acquireReferenceResults(acquirers, selectedReferenceCases);

for (const { referenceCase, result } of acquiredResults) {
  const fixturePath = path.join(referenceDir, "fixtures", referenceCase.fixtureFile);

  await writeReferenceResult(fixturePath, result);

  console.log(fixturePath);
}

const metadataPath = path.join(referenceDir, "metadata.json");
await writeReferenceMetadata(metadataPath, metadata);
console.log(metadataPath);
