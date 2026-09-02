import path from "node:path";
import url from "node:url";

import { createReferenceClient } from "./client";
import { loadOAuthConfig, loadReferenceConfig } from "./config";
import { referenceCases } from "./core/cases";
import { acquireReferenceFixture } from "./core/fixture";
import { writeReferenceFixture } from "./fixtureStore";
import { createAccessTokenProvider } from "./oauth";
import { computeCaseRevision, loadReferenceProjectFiles, updateReferenceProject } from "./project";

const referenceDir = url.fileURLToPath(new URL("../../reference/", import.meta.url));

const config = loadReferenceConfig();
const oauthConfig = loadOAuthConfig();
const accessTokenProvider = createAccessTokenProvider(oauthConfig);

const files = await loadReferenceProjectFiles(referenceDir);

const caseRevision = computeCaseRevision(files);

await updateReferenceProject(config, accessTokenProvider, files);

for (const referenceCase of referenceCases) {
  const client = createReferenceClient(config, accessTokenProvider);
  const fixture = await acquireReferenceFixture(client, referenceCase.functionName, caseRevision);

  const fixturePath = path.join(referenceDir, "fixtures", referenceCase.fixtureFile);

  await writeReferenceFixture(fixturePath, fixture);

  console.log(fixturePath);
}
