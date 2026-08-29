import { describe, expect, test } from "vitest";

import { Range } from "./Range";

describe("getCell", () => {
  test("check argument boundaries", () => {
    const range = new Range("", 0, 1, 1, 100, 100, () => {});

    // minimum boundaries
    expect(() => range.getCell(1, 1)).not.toThrow();
    expect(() => range.getCell(0, 1)).toThrow("out of range.");
    expect(() => range.getCell(1, 0)).toThrow("out of range.");

    // maximum boundaries
    expect(() => range.getCell(100, 100)).not.toThrow();
    expect(() => range.getCell(101, 100)).toThrow("out of range.");
    expect(() => range.getCell(100, 101)).toThrow("out of range.");
  });
});
