import { describe, expect, test } from "vitest";

import { Range } from "./Range";

describe("getCell", () => {
  test("check args bundary", () => {
    const range = new Range("", 0, 100, 100, 100, 100, () => {});

    expect(range.getCell(1, 1));
    expect(() => range.getCell(0, 1)).toThrow("out of range.");
    expect(() => range.getCell(1, 0)).toThrow("out of range.");
    expect(() => range.getCell(999, 1)).toThrow("out of range.");
    expect(() => range.getCell(1, 999)).toThrow("out of range.");
  });
});
