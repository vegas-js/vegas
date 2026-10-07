import { describe, expect, test } from "vitest";

import {
  remapDeletedDimensionPositions,
  remapInsertedDimensionPositions,
  remapMovedDimensionPosition,
  remapMovedDimensionPositions,
} from "./in-memory-dimension";

describe("in-memory Spreadsheet dimension positions", () => {
  test("drop deleted positions and shift later positions", () => {
    expect(
      [...remapDeletedDimensionPositions(new Set([1, 2, 4, 5, 7]), 3, 3)].sort((a, b) => a - b),
    ).toStrictEqual([1, 2, 4]);
  });

  test("shift positions at and after an insertion", () => {
    expect(
      [...remapInsertedDimensionPositions(new Set([1, 3, 5]), 3, 2)].sort((a, b) => a - b),
    ).toStrictEqual([1, 5, 7]);
  });

  test("remap positions with a moved dimension span", () => {
    expect(
      [...remapMovedDimensionPositions(new Set([1, 2, 3, 5]), 2, 2, 5)].sort((a, b) => a - b),
    ).toStrictEqual([1, 3, 4, 5]);
  });

  test("treat destinations inside the moved span as a no-op", () => {
    expect(remapMovedDimensionPosition(1, 2, 2, 3)).toBe(1);
    expect(remapMovedDimensionPosition(2, 2, 2, 3)).toBe(2);
    expect(remapMovedDimensionPosition(3, 2, 2, 3)).toBe(3);
    expect(remapMovedDimensionPosition(4, 2, 2, 3)).toBe(4);
  });
});
