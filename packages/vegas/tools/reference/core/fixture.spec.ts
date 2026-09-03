import { expect, test } from "vitest";

import { acquireReferenceResult, createReferenceMetadata } from "./fixture";
import type { ReferenceExecutor } from "./types";

test("builds a reference fixture", async () => {
  const executor: ReferenceExecutor = {
    async execute() {
      return "result";
    },
  };

  await expect(acquireReferenceResult(executor, "captureReferenceSmoke")).resolves.toEqual(
    "result",
  );
});

test("builds reference metadata", () => {
  expect(createReferenceMetadata("revision")).toEqual({
    runtime: "V8",
    caseRevision: "revision",
  });
});
