import { describe, expect, test } from "vitest";

import { InMemorySpreadsheetGrid } from "./in-memory-spreadsheet-grid";

const RANGE = {
  row: 1,
  column: 1,
  numRows: 2,
  numColumns: 3,
} as const;

function createGrid(date = new Date("2026-09-18T00:00:00.000Z")) {
  return new InMemorySpreadsheetGrid(10, 8, [
    ["Name", "Amount", date],
    ["Vegas", 42, true],
  ]);
}

describe("InMemorySpreadsheetGrid", () => {
  test("return seeded values, empty strings for blank cells, and detached Dates", () => {
    const seedDate = new Date("2026-09-18T00:00:00.000Z");
    const grid = createGrid(seedDate);

    seedDate.setUTCFullYear(2030);

    const values = grid.getValues({
      ...RANGE,
      numRows: 3,
    });

    expect(values).toStrictEqual([
      ["Name", "Amount", new Date("2026-09-18T00:00:00.000Z")],
      ["Vegas", 42, true],
      ["", "", ""],
    ]);

    const returnedDate = values[0]?.[2];
    expect(returnedDate).toBeInstanceOf(Date);

    if (!(returnedDate instanceof Date)) {
      throw new Error("expected Date cell value");
    }

    returnedDate.setUTCFullYear(2040);

    expect(grid.getValues(RANGE)).toStrictEqual([
      ["Name", "Amount", new Date("2026-09-18T00:00:00.000Z")],
      ["Vegas", 42, true],
    ]);
  });

  test("calculate data bounds from non-empty cells", () => {
    expect(createGrid().getDataBounds()).toStrictEqual({
      lastRow: 2,
      lastColumn: 3,
    });
    expect(new InMemorySpreadsheetGrid(5, 5).getDataBounds()).toStrictEqual({
      lastRow: null,
      lastColumn: null,
    });
  });

  test("write an exact rectangular range without retaining mutable Date inputs", () => {
    const grid = createGrid();
    const date = new Date("2026-09-19T00:00:00.000Z");

    grid.setValues(RANGE, [
      ["Updated", 100, date],
      ["Second", false, ""],
    ]);

    date.setUTCFullYear(2030);

    expect(grid.getValues(RANGE)).toStrictEqual([
      ["Updated", 100, new Date("2026-09-19T00:00:00.000Z")],
      ["Second", false, ""],
    ]);
    expect(grid.getDataBounds()).toStrictEqual({
      lastRow: 2,
      lastColumn: 3,
    });
  });

  test("store notes independently from values and data bounds", () => {
    const grid = createGrid();

    expect(grid.getNotes(RANGE)).toStrictEqual([
      ["", "", ""],
      ["", "", ""],
    ]);

    grid.setNotes(RANGE, [
      ["header", null, ""],
      ["name", "amount", null],
    ]);

    expect(grid.getNotes(RANGE)).toStrictEqual([
      ["header", "", ""],
      ["name", "amount", ""],
    ]);
    expect(grid.getValues(RANGE)).toStrictEqual([
      ["Name", "Amount", new Date("2026-09-18T00:00:00.000Z")],
      ["Vegas", 42, true],
    ]);
    expect(grid.getDataBounds()).toStrictEqual({
      lastRow: 2,
      lastColumn: 3,
    });

    grid.clearNotes();

    expect(grid.getNotes(RANGE)).toStrictEqual([
      ["", "", ""],
      ["", "", ""],
    ]);
    expect(grid.getValues(RANGE)).toStrictEqual([
      ["Name", "Amount", new Date("2026-09-18T00:00:00.000Z")],
      ["Vegas", 42, true],
    ]);
    expect(grid.getDataBounds()).toStrictEqual({
      lastRow: 2,
      lastColumn: 3,
    });

    expect(() => grid.setNotes(RANGE, [["too short"]])).toThrow("note dimensions must match");
  });

  test("reject mismatched value dimensions before changing any cells", () => {
    const grid = createGrid();

    expect(() =>
      grid.setValues(RANGE, [
        ["Changed", 1],
        ["Too", "Short"],
      ]),
    ).toThrow("dimensions must match");

    expect(grid.getValues(RANGE)).toStrictEqual([
      ["Name", "Amount", new Date("2026-09-18T00:00:00.000Z")],
      ["Vegas", 42, true],
    ]);
  });

  test("reject ranges outside grid bounds", () => {
    const grid = createGrid();

    expect(() =>
      grid.getValues({
        ...RANGE,
        row: 10,
        numRows: 2,
      }),
    ).toThrow("outside sheet bounds");
  });
});
