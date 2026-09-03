import { expect, test } from "vitest";

import {
  acquireReferenceResult,
  acquireReferenceResults,
  createReferenceMetadata,
} from "./fixture";
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

test("acquires reference results concurrently while preserving case order", async () => {
  let active = 0;
  let maxActive = 0;

  const executor: ReferenceExecutor = {
    async execute(functionName) {
      active += 1;
      maxActive = Math.max(maxActive, active);

      await new Promise((resolve) => setTimeout(resolve, functionName === "first" ? 30 : 5));

      active -= 1;
      return functionName;
    },
  };

  const cases = [
    {
      name: "first",
      functionName: "first",
      fixtureFile: "first.json",
      runtimeTest: "required" as const,
    },
    {
      name: "second",
      functionName: "second",
      fixtureFile: "second.json",
      runtimeTest: "required" as const,
    },
    {
      name: "third",
      functionName: "third",
      fixtureFile: "third.json",
      runtimeTest: "required" as const,
    },
  ];

  const results = await acquireReferenceResults(executor, cases, 2);

  expect(maxActive).toBe(2);
  expect(results.map(({ referenceCase }) => referenceCase.name)).toEqual([
    "first",
    "second",
    "third",
  ]);
  expect(results.map(({ result }) => result)).toEqual(["first", "second", "third"]);
});
