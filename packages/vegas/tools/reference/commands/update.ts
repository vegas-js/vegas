import path from "node:path";
import url from "node:url";

import { referenceCases } from "../core/cases";
import { acquireReferenceResults, createReferenceMetadata } from "../core/fixture";
import { writeReferenceResult, writeReferenceMetadata } from "../fixtures/store";
import { createReferenceClient } from "../gas/client";
import { loadOAuthConfig, loadReferenceConfig } from "../gas/config";
import { createAccessTokenProvider } from "../gas/oauth";
import {
  computeCaseRevision,
  loadReferenceProjectFiles,
  updateReferenceProject,
} from "../gas/project";

const referenceDir = url.fileURLToPath(new URL("../../../reference/", import.meta.url));

const config = loadReferenceConfig();
const oauthConfig = loadOAuthConfig();
const accessTokenProvider = createAccessTokenProvider(oauthConfig);

const files = await loadReferenceProjectFiles(referenceDir);

const caseRevision = computeCaseRevision(files);
const metadata = createReferenceMetadata(caseRevision);

await updateReferenceProject(config, accessTokenProvider, files);
const client = createReferenceClient(config, accessTokenProvider);
const acquiredResults = await acquireReferenceResults(client, referenceCases);

for (const { referenceCase, result } of acquiredResults) {
  const fixturePath = path.join(referenceDir, "fixtures", referenceCase.fixtureFile);

  await writeReferenceResult(fixturePath, result);

  console.log(fixturePath);
}

const metadataPath = path.join(referenceDir, "metadata.json");
await writeReferenceMetadata(metadataPath, metadata);
console.log(metadataPath);
