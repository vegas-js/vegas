import { expect, test } from "vitest";

import { acquireReference } from "./acquire";
import type { ReferenceExecutor } from "./types";

test("acquires and normalizes a reference result", async () => {
  const executor: ReferenceExecutor = {
    async execute() {
      return {
        value: "result",
      };
    },
  };

  await expect(acquireReference(executor, "captureReferenceSmoke")).resolves.toEqual({
    value: "result",
  });
});

test("rejects when executor execution fails", async () => {
  const executor: ReferenceExecutor = {
    async execute() {
      throw new Error("GAS execution Error");
    },
  };

  await expect(acquireReference(executor, "captureReferenceSmoke")).rejects.toThrow(
    "GAS execution Error",
  );
});
