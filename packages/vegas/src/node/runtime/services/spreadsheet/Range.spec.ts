import { describe, expect, test } from "vitest";

import type { RuntimeServicePort } from "../../protocol";
import { Range } from "./Range";

function createRangeService(
  overrides: Partial<RuntimeServicePort<"Range">> = {},
): RuntimeServicePort<"Range"> {
  return {
    getValue: () => [[]],
    getValues: () => [[]],
    setValue: () => {},
    setValues: () => {},
    ...overrides,
  };
}

describe("getCell", () => {
  test("check argument boundaries", () => {
    const range = new Range("", 0, 1, 1, 100, 100, createRangeService());

    // minimum boundaries
    expect(() => range.getCell(1, 1)).not.toThrow();
    expect(() => range.getCell(1, 0)).toThrow();
    expect(() => range.getCell(0, 1)).toThrow();

    // maximum boundaries
    expect(() => range.getCell(100, 100)).not.toThrow();
    expect(() => range.getCell(101, 100)).toThrow();
    expect(() => range.getCell(100, 101)).toThrow();
  });
});
