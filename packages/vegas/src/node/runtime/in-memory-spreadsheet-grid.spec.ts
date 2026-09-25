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

  test("clone values and notes without sharing mutable state", () => {
    const grid = createGrid();
    const singleCellRange = {
      ...RANGE,
      numRows: 1,
      numColumns: 1,
    };

    grid.setNotes(singleCellRange, [["original note"]]);

    const clone = grid.clone();

    grid.setValues(singleCellRange, [["original update"]]);
    grid.setNotes(singleCellRange, [["original update"]]);

    expect(clone.getValues(singleCellRange)).toStrictEqual([["Name"]]);
    expect(clone.getNotes(singleCellRange)).toStrictEqual([["original note"]]);

    clone.setValues(singleCellRange, [["clone update"]]);
    clone.setNotes(singleCellRange, [["clone update"]]);

    expect(grid.getValues(singleCellRange)).toStrictEqual([["original update"]]);
    expect(grid.getNotes(singleCellRange)).toStrictEqual([["original update"]]);
  });

  test("move rows and columns using destination coordinates from before source removal", () => {
    const grid = new InMemorySpreadsheetGrid(5, 5, [
      ["A1", "B1", "C1", "D1", "E1"],
      ["A2", "B2", "C2", "D2", "E2"],
      ["A3", "B3", "C3", "D3", "E3"],
      ["A4", "B4", "C4", "D4", "E4"],
      ["A5", "B5", "C5", "D5", "E5"],
    ]);
    const noteRange = {
      row: 2,
      column: 2,
      numRows: 1,
      numColumns: 1,
    };

    grid.setNotes(noteRange, [["moved note"]]);
    grid.moveColumns(1, 2, 5);
    grid.moveRows(1, 2, 5);

    expect(
      grid.getValues({
        row: 1,
        column: 1,
        numRows: 5,
        numColumns: 5,
      }),
    ).toStrictEqual([
      ["C3", "D3", "A3", "B3", "E3"],
      ["C4", "D4", "A4", "B4", "E4"],
      ["C1", "D1", "A1", "B1", "E1"],
      ["C2", "D2", "A2", "B2", "E2"],
      ["C5", "D5", "A5", "B5", "E5"],
    ]);
    expect(
      grid.getNotes({
        ...noteRange,
        row: 4,
        column: 4,
      }),
    ).toStrictEqual([["moved note"]]);

    grid.moveColumns(3, 2, 1);
    grid.moveRows(3, 2, 1);

    expect(grid.getValues(RANGE)).toStrictEqual([
      ["A1", "B1", "C1"],
      ["A2", "B2", "C2"],
    ]);
    expect(grid.getNotes(noteRange)).toStrictEqual([["moved note"]]);

    expect(() => grid.moveColumns(1, 1, 7)).toThrow("column destination must be between 1 and 6");
    expect(() => grid.moveRows(1, 1, 7)).toThrow("row destination must be between 1 and 6");
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
