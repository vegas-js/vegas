import { describe, expect, test } from "vitest";

import { createRuntimeEnum } from "./runtime-enum";

describe("createRuntimeEnum", () => {
  test("represent Apps Script enum values as same-name strings", () => {
    const value = createRuntimeEnum("GRID", "OBJECT");

    expect(value).toStrictEqual({
      GRID: "GRID",
      OBJECT: "OBJECT",
    });
    expect(JSON.stringify(value.GRID)).toBe('"GRID"');
    expect(JSON.stringify(value.OBJECT)).toBe('"OBJECT"');
  });
});
