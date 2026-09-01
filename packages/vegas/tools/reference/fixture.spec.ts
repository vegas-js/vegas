import { expect, test } from "vitest";

import { REFERENCE_SCHEMA_VERSION } from "./constants";
import { acquireReferenceFixture } from "./fixture";
import type { GASReferenceClient } from "./types";

test("builds a reference fixture", async () => {
  const client: GASReferenceClient = {
    async execute() {
      return {
        value: "result",
      };
    },
  };

  await expect(
    acquireReferenceFixture(client, "captureReferenceSmoke", "revision"),
  ).resolves.toEqual({
    metadata: {
      schemaVersion: REFERENCE_SCHEMA_VERSION,
      runtime: "V8",
      caseRevision: "revision",
    },
    result: {
      value: "result",
    },
  });
});
