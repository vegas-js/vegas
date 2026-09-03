import path from "node:path";
import url from "node:url";

import { expect, test } from "vitest";

import { referenceCases } from "../core/cases";
import { acquireReferenceResult, createReferenceMetadata } from "../core/fixture";
import { readReferenceResult, readReferenceMetadata } from "../fixtures/store";
import { computeCaseRevision, loadReferenceProjectFiles } from "../gas/project";
import { createVegasReferenceExecutor } from "./executor";

const referenceDir = url.fileURLToPath(new URL("../../../reference/", import.meta.url));
const files = await loadReferenceProjectFiles(referenceDir);
const caseRevision = computeCaseRevision(files);
const expectedMetadata = await readReferenceMetadata(path.join(referenceDir, "metadata.json"));
const actualMetadata = createReferenceMetadata(caseRevision);
const bundled = files.find((file) => file.name === "Code" && file.type === "SERVER_JS");
if (!bundled) {
  throw new Error("Reference case Code.js was not found");
}

test("reference metadata matches bundled cases", () => {
  expect(actualMetadata).toStrictEqual(expectedMetadata);
});

for (const referenceCase of referenceCases) {
  if (referenceCase.runtimeTest === "pending") {
    test.todo(`Vegas runtime matches GAS reference: ${referenceCase.name}`);
    continue;
  }

  test(`Vegas runtime matches GAS reference: ${referenceCase.name}`, async () => {
    const executor = createVegasReferenceExecutor(bundled.source);

    const actual = await acquireReferenceResult(executor, referenceCase.functionName);

    const expected = await readReferenceResult(
      path.join(referenceDir, "fixtures", referenceCase.fixtureFile),
    );

    expect(actual).toStrictEqual(expected);
  });
}
