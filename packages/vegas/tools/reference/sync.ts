import { fileURLToPath } from "node:url";

import { loadOAuthConfig, loadReferenceConfig } from "./config";
import { createAccessTokenProvider } from "./oauth";
import { computeCaseRevision, loadReferenceProjectFiles, updateReferenceProject } from "./project";

const referenceDir = fileURLToPath(new URL("../../reference/", import.meta.url));

const config = loadReferenceConfig();
const oauthConfig = loadOAuthConfig();
const accessTokenProvider = createAccessTokenProvider(oauthConfig);

const files = await loadReferenceProjectFiles(referenceDir);

const caseRevision = computeCaseRevision(files);

await updateReferenceProject(config, accessTokenProvider, files);

console.log(
  JSON.stringify(
    {
      caseRevision,
      files: files.map(({ name }) => name),
    },
    null,
    2,
  ),
);
