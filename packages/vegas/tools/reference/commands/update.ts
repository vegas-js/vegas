import path from "node:path";
import url from "node:url";

import { referenceCases } from "../core/cases";
import { acquireReferenceResult, createReferenceMetadata } from "../core/fixture";
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
const acquiredFixtures: Array<{
  path: string;
  fixture: Awaited<ReturnType<typeof acquireReferenceResult>>;
}> = [];

for (const referenceCase of referenceCases) {
  const client = createReferenceClient(config, accessTokenProvider);
  const fixture = await acquireReferenceResult(client, referenceCase.functionName);

  const fixturePath = path.join(referenceDir, "fixtures", referenceCase.fixtureFile);

  acquiredFixtures.push({
    path: fixturePath,
    fixture,
  });
}

for (const { path: fixturePath, fixture } of acquiredFixtures) {
  await writeReferenceResult(fixturePath, fixture);

  console.log(fixturePath);
}

const metadataPath = path.join(referenceDir, "metadata.json");
await writeReferenceMetadata(metadataPath, metadata);
console.log(metadataPath);
