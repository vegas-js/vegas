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

  test("throws the characterized GAS Exception when getCell is out of range", () => {
    const range = new Range("", 0, 1, 1, 2, 2, createRangeService());

    const captureError = (row: number, column: number) => {
      try {
        range.getCell(row, column);
        throw new Error("Expected getCell to throw");
      } catch (error) {
        return error as Error;
      }
    };

    for (const [row, column] of [
      [0, 1],
      [1, 0],
      [3, 1],
      [1, 3],
    ]) {
      const error = captureError(row, column);

      expect(error.name).toBe("Exception");
      expect(error.message).toBe("Cell reference out of range");
    }
  });
});
