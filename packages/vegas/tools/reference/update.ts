import path from "node:path";
import url from "node:url";

import { referenceCases } from "./core/cases";
import { acquireReferenceFixture } from "./core/fixture";
import { writeReferenceFixture } from "./fixtures/store";
import { createReferenceClient } from "./gas/client";
import { loadOAuthConfig, loadReferenceConfig } from "./gas/config";
import { createAccessTokenProvider } from "./gas/oauth";
import {
  computeCaseRevision,
  loadReferenceProjectFiles,
  updateReferenceProject,
} from "./gas/project";

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
