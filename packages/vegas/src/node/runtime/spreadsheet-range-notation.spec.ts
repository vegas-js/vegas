import { describe, expect, test } from "vitest";

import { resolveSpreadsheetRangeNotation } from "./spreadsheet-range-notation";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

describe("resolveSpreadsheetRangeNotation", () => {
  test("resolve absolute A1 cell and rectangular references", () => {
    expect(resolveSpreadsheetRangeNotation("A1", 100, 26)).toStrictEqual({
      row: 1,
      column: 1,
      numRows: 1,
      numColumns: 1,
    });
    expect(resolveSpreadsheetRangeNotation("$B$2:$D$4", 100, 26)).toStrictEqual({
      row: 2,
      column: 2,
      numRows: 3,
      numColumns: 3,
    });
  });

  test("resolve A1 full-column and full-row references from Sheet dimensions", () => {
    expect(resolveSpreadsheetRangeNotation("B:D", 100, 26)).toStrictEqual({
      row: 1,
      column: 2,
      numRows: 100,
      numColumns: 3,
    });
    expect(resolveSpreadsheetRangeNotation("2:4", 100, 26)).toStrictEqual({
      row: 2,
      column: 1,
      numRows: 3,
      numColumns: 26,
    });
  });

  test("resolve unambiguous absolute R1C1 references", () => {
    expect(resolveSpreadsheetRangeNotation("R2C3:R4C5", 100, 26)).toStrictEqual({
      row: 2,
      column: 3,
      numRows: 3,
      numColumns: 3,
    });
  });

  test("prefer valid A1 interpretation for notation that is also R1C1-like", () => {
    expect(resolveSpreadsheetRangeNotation("C2:C4", 100, 26)).toStrictEqual({
      row: 2,
      column: 3,
      numRows: 3,
      numColumns: 1,
    });
    expect(resolveSpreadsheetRangeNotation("R2:R4", 100, 26)).toStrictEqual({
      row: 2,
      column: 18,
      numRows: 3,
      numColumns: 1,
    });
  });

  test("reject reversed notation bounds", () => {
    expect(() => resolveSpreadsheetRangeNotation("D4:B2", 100, 26)).toThrow(
      "Spreadsheet range notation must not reverse its bounds.",
    );
    expect(() => resolveSpreadsheetRangeNotation("R4C5:R2C3", 100, 26)).toThrow(
      "Spreadsheet range notation must not reverse its bounds.",
    );
  });

  test("fail closed for notation forms not modeled by the local Runtime", () => {
    for (const notation of ["R[1]C[1]", "Other!A1", "A1:B"]) {
      expect(() => resolveSpreadsheetRangeNotation(notation, 100, 26)).toThrow(
        UnsupportedRuntimeOperationError,
      );
    }
  });
});
