import path from "node:path";
import url from "node:url";

import { expect, test } from "vitest";

import { referenceCases } from "./core/cases";
import { acquireReferenceFixture } from "./core/fixture";
import { readReferenceFixture } from "./fixtureStore";
import { computeCaseRevision, loadReferenceProjectFiles } from "./project";
import { createVegasReferenceExecutor } from "./vegasExecutor";

const referenceDir = url.fileURLToPath(new URL("../../reference/", import.meta.url));
const files = await loadReferenceProjectFiles(referenceDir);
const caseRevision = computeCaseRevision(files);
const bundled = files.find((file) => file.name === "Code" && file.type === "SERVER_JS");
if (!bundled) {
  throw new Error("Reference case Code.js was not found");
}

for (const referenceCase of referenceCases) {
  if (referenceCase.runtimeTest === "pending") {
    test.todo(`Vegas runtime matches GAS reference: ${referenceCase.name}`);
    continue;
  }

  test(`Vegas runtime matches GAS reference: ${referenceCase.name}`, async () => {
    const executor = createVegasReferenceExecutor(bundled.source);

    const actual = await acquireReferenceFixture(
      executor,
      referenceCase.functionName,
      caseRevision,
    );

    const expected = await readReferenceFixture(
      path.join(referenceDir, "fixtures", referenceCase.fixtureFile),
    );

    expect(actual).toStrictEqual(expected);
  });
}
