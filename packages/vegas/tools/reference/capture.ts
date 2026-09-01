import { fileURLToPath } from "node:url";

import { createReferenceClient } from "./client";
import { loadOAuthConfig, loadReferenceConfig } from "./config";
import { acquireReferenceFixture } from "./fixture";
import { createAccessTokenProvider } from "./oauth";
import { computeCaseRevision, loadReferenceProjectFiles, updateReferenceProject } from "./project";

const referenceDir = fileURLToPath(new URL("../../reference/", import.meta.url));

const config = loadReferenceConfig();
const oauthConfig = loadOAuthConfig();

const accessTokenProvider = createAccessTokenProvider(oauthConfig);

const files = await loadReferenceProjectFiles(referenceDir);

const caseRevision = computeCaseRevision(files);

await updateReferenceProject(config, accessTokenProvider, files);

const client = createReferenceClient(config, accessTokenProvider);

const fixture = await acquireReferenceFixture(client, "captureReferenceSmoke", caseRevision);

console.log(JSON.stringify(fixture, null, 2));
