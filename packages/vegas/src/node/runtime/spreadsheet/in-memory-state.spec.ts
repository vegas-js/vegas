import { describe, expect, test } from "vitest";

import {
  cloneSpreadsheetState,
  createFixtureSpreadsheetState,
  createRuntimeSpreadsheetState,
} from "./in-memory-state";

describe("in-memory Spreadsheet state", () => {
  test("create fixture state with deterministic local defaults", () => {
    const state = createFixtureSpreadsheetState({
      id: "spreadsheet-a",
      url: "http://localhost:5173/spreadsheets/spreadsheet-a",
      name: "Budget",
      sheets: [
        {
          id: 7,
          name: "Summary",
          maxRows: 10,
          maxColumns: 8,
          values: [["Name", "Amount"]],
        },
        {
          id: 9,
          name: "Archive",
          maxRows: 5,
          maxColumns: 5,
        },
      ],
    });

    expect(state.reference).toStrictEqual({
      service: "spreadsheet",
      kind: "spreadsheet",
      id: "spreadsheet-a",
    });
    expect(state.metadata).toStrictEqual({ name: "Budget" });
    expect(state.locale).toBe("en_US");
    expect(state.timeZone).toBe("Etc/UTC");
    expect(state.ownership).toBe("fixture");
    expect(state.url).toBe("http://localhost:5173/spreadsheets/spreadsheet-a");
    expect(state.nextSheetId).toBe(10);
    expect([...state.sheets.keys()]).toStrictEqual([7, 9]);
    expect(state.sheets.get(7)?.metadata).toStrictEqual({
      name: "Summary",
      maxRows: 10,
      maxColumns: 8,
      frozenColumns: 0,
      frozenRows: 0,
      hidden: false,
      hiddenGridlines: false,
      rightToLeft: false,
      tabColor: null,
    });
  });

  test("create runtime-owned state with the deterministic blank Sheet", () => {
    const state = createRuntimeSpreadsheetState("spreadsheet:1", "Created", 3, 4);

    expect(state.reference.id).toBe("spreadsheet:1");
    expect(state.metadata).toStrictEqual({ name: "Created" });
    expect(state.ownership).toBe("runtime");
    expect(state.nextSheetId).toBe(1);
    expect(state.sheets.get(0)?.reference).toStrictEqual({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet:1",
      sheetId: 0,
    });
    expect(state.sheets.get(0)?.metadata).toMatchObject({
      name: "Sheet1",
      maxRows: 3,
      maxColumns: 4,
    });
  });

  test("clone mutable Spreadsheet state without sharing nested state", () => {
    const state = createFixtureSpreadsheetState({
      id: "spreadsheet-a",
      name: "Budget",
      sheets: [{ id: 7, name: "Summary", maxRows: 2, maxColumns: 2, values: [["before"]] }],
    });
    const sheet = state.sheets.get(7);

    if (sheet === undefined) {
      throw new Error("expected seeded Sheet state");
    }

    const clone = cloneSpreadsheetState(state);
    const clonedSheet = clone.sheets.get(7);

    if (clonedSheet === undefined) {
      throw new Error("expected cloned Sheet state");
    }

    expect(clone).not.toBe(state);
    expect(clone.reference).not.toBe(state.reference);
    expect(clone.metadata).not.toBe(state.metadata);
    expect(clone.sheets).not.toBe(state.sheets);
    expect(clone.ownership).toBe("fixture");
    expect(clone.nextSheetId).toBe(state.nextSheetId);
    expect(clonedSheet).not.toBe(sheet);
    expect(clonedSheet.reference).not.toBe(sheet.reference);
    expect(clonedSheet.metadata).not.toBe(sheet.metadata);
    expect(clonedSheet.hiddenColumns).not.toBe(sheet.hiddenColumns);
    expect(clonedSheet.hiddenRows).not.toBe(sheet.hiddenRows);
    expect(clonedSheet.grid).not.toBe(sheet.grid);

    sheet.grid.setValues({ row: 1, column: 1, numRows: 1, numColumns: 1 }, [["original"]]);
    clonedSheet.grid.setValues({ row: 1, column: 1, numRows: 1, numColumns: 1 }, [["clone"]]);

    expect(sheet.grid.getValues({ row: 1, column: 1, numRows: 1, numColumns: 1 })).toStrictEqual([
      ["original"],
    ]);
    expect(
      clonedSheet.grid.getValues({ row: 1, column: 1, numRows: 1, numColumns: 1 }),
    ).toStrictEqual([["clone"]]);
  });

  test("reject duplicate fixture Sheet ids and names", () => {
    expect(() =>
      createFixtureSpreadsheetState({
        id: "spreadsheet-a",
        name: "Duplicate ids",
        sheets: [
          { id: 1, name: "First", maxRows: 1, maxColumns: 1 },
          { id: 1, name: "Second", maxRows: 1, maxColumns: 1 },
        ],
      }),
    ).toThrow("Duplicate local Spreadsheet sheet id: spreadsheet-a#1");

    expect(() =>
      createFixtureSpreadsheetState({
        id: "spreadsheet-a",
        name: "Duplicate names",
        sheets: [
          { id: 1, name: "Same", maxRows: 1, maxColumns: 1 },
          { id: 2, name: "Same", maxRows: 1, maxColumns: 1 },
        ],
      }),
    ).toThrow("Duplicate local Spreadsheet sheet name: Same");
  });
});
