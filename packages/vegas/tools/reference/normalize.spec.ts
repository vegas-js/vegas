import { expect, test } from "vitest";

import { normalizeReferenceResult } from "./normalize";

test("preserves primitive values", () => {
  expect(normalizeReferenceResult("value")).toBe("value");
});

test("preserves structured values", () => {
  const value = {
    nested: [1, "value", null],
  };

  expect(normalizeReferenceResult(value)).toBe(value);
});
