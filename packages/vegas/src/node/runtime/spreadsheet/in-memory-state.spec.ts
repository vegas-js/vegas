import { describe, expect, test } from "vitest";

import { createFixtureSpreadsheetState, createRuntimeSpreadsheetState } from "./in-memory-state";

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
