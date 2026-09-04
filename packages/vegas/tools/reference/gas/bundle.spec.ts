import url from "node:url";

import { expect, test } from "vitest";

import { bundleReferenceCases } from "./bundle";

test("appends raw execution characterization source after the GAS export bridge", async () => {
  const referenceDir = url.fileURLToPath(new URL("../../../reference/", import.meta.url));

  const source = await bundleReferenceCases(referenceDir);

  const bridgeIndex = source.indexOf("/* Function bridge for GAS Client */");
  const rawSourceIndex = source.indexOf(
    "/* Raw GAS execution-semantics characterization source. */",
  );
  const rawFunctionIndex = source.indexOf("function captureReferenceExecutionGlobalLifecycle()");

  expect(bridgeIndex).toBeGreaterThanOrEqual(0);
  expect(rawSourceIndex).toBeGreaterThan(bridgeIndex);
  expect(rawFunctionIndex).toBeGreaterThan(rawSourceIndex);
});
