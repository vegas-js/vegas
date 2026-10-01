import { describe, expect, test } from "vitest";

import {
  compareSpreadsheetQueryValues,
  matchesSpreadsheetComparison,
} from "./spreadsheet-query-comparison";

describe("spreadsheet query comparison", () => {
  test("treat numeric signed zero as equal for ordering", () => {
    expect(compareSpreadsheetQueryValues(-0, 0, "comparison failed")).toBe(0);
  });

  test("treat dates with equal timestamps as equal for ordering", () => {
    expect(compareSpreadsheetQueryValues(new Date(0), new Date(0), "comparison failed")).toBe(0);
  });

  test("preserve Object.is semantics for equality and inequality", () => {
    expect(matchesSpreadsheetComparison(Number.NaN, "equal", Number.NaN)).toBe(true);
    expect(matchesSpreadsheetComparison(-0, "equal", 0)).toBe(false);
    expect(matchesSpreadsheetComparison(-0, "not-equal", 0)).toBe(true);
  });

  test("reject invalid dates and non-finite numbers for ordering", () => {
    expect(() => compareSpreadsheetQueryValues(Number.NaN, 0, "comparison failed")).toThrow(
      "comparison failed",
    );
    expect(() =>
      compareSpreadsheetQueryValues(new Date(Number.NaN), new Date(0), "comparison failed"),
    ).toThrow("comparison failed");
  });
});
