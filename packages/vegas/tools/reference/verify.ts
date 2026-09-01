import url from "node:url";

import { createReferenceClient } from "./client";
import { compareReference } from "./compare";
import { loadOAuthConfig, loadReferenceConfig } from "./config";
import { acquireReferenceFixture } from "./fixture";
import { readReferenceFixture } from "./fixtureStore";
import { createAccessTokenProvider } from "./oauth";
import { computeCaseRevision, loadReferenceProjectFiles, updateReferenceProject } from "./project";

async function main(): Promise<void> {
  const referenceDir = url.fileURLToPath(new URL("../../reference/", import.meta.url));

  const fixturePath = url.fileURLToPath(
    new URL("../../reference/fixtures/smoke.json", import.meta.url),
  );

  const config = loadReferenceConfig();
  const oauthConfig = loadOAuthConfig();

  const accessTokenProvider = createAccessTokenProvider(oauthConfig);

  const files = await loadReferenceProjectFiles(referenceDir);

  const caseRevision = computeCaseRevision(files);

  await updateReferenceProject(config, accessTokenProvider, files);

  const client = createReferenceClient(config, accessTokenProvider);

  const actual = await acquireReferenceFixture(client, "captureReferenceSmoke", caseRevision);

  const expected = await readReferenceFixture(fixturePath);

  const comparison = compareReference(expected, actual);

  if (comparison.equal) {
    console.log("Reference fixture matches.");
    return;
  }

  console.error("Reference drift detected.");
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

  process.exitCode = 2;
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));

  process.exitCode = 1;
}
