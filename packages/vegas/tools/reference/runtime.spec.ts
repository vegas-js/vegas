import url from "node:url";

import { expect, test } from "vitest";

import { acquireReferenceFixture } from "./fixture";
import { readReferenceFixture } from "./fixtureStore";
import { computeCaseRevision, loadReferenceProjectFiles } from "./project";
import { createVegasReferenceExecutor } from "./vegasExecutor";

test("Vegas runtime matches the GAS smoke reference", async () => {
  const referenceDir = url.fileURLToPath(new URL("../../reference/", import.meta.url));
  const fixturePath = url.fileURLToPath(
    new URL("../../reference/fixtures/smoke.json", import.meta.url),
  );
  const files = await loadReferenceProjectFiles(referenceDir);
  const caseRevision = computeCaseRevision(files);
  const smoke = files.find((file) => file.name === "smoke" && file.type === "SERVER_JS");
  if (!smoke) {
    throw new Error("Reference case smoke.js was not found");
  }
  const executor = createVegasReferenceExecutor(smoke.source);
  const actual = await acquireReferenceFixture(executor, "captureReferenceSmoke", caseRevision);
  const expected = await readReferenceFixture(fixturePath);

  expect(actual).toStrictEqual(expected);
});
