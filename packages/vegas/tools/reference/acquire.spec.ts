import { expect, test } from "vitest";

import { acquireReference } from "./acquire";
import type { GASReferenceClient } from "./types";

test("acquires and normalizes a reference result", async () => {
  const client: GASReferenceClient = {
    async execute() {
      return {
        value: "result",
      };
    },
  };

  await expect(acquireReference(client, "captureReferenceSmoke")).resolves.toEqual({
    value: "result",
  });
});

test("acquires reject with client execute", async () => {
  const client: GASReferenceClient = {
    async execute() {
      throw new Error("GAS execution Error");
    },
  };

  await expect(acquireReference(client, "captureReferenceSmoke")).rejects.toThrow(
    "GAS execution Error",
  );
});
