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
  const bundled = files.find((file) => file.name === "Code" && file.type === "SERVER_JS");
  if (!bundled) {
    throw new Error("Reference case Code.js was not found");
  }
  const executor = createVegasReferenceExecutor(bundled.source);
  const actual = await acquireReferenceFixture(executor, "captureReferenceSmoke", caseRevision);
  const expected = await readReferenceFixture(fixturePath);

  expect(actual).toStrictEqual(expected);
});
