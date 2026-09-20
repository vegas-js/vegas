import { describe, expect, test } from "vitest";

import { InMemorySpreadsheetStore } from "./in-memory-spreadsheet-store";
import type { RangeReference, SheetReference, SpreadsheetReference } from "./spreadsheet-reference";

const SPREADSHEET: SpreadsheetReference = {
  service: "spreadsheet",
  kind: "spreadsheet",
  id: "spreadsheet-a",
};

const SUMMARY: SheetReference = {
  service: "spreadsheet",
  kind: "sheet",
  spreadsheetId: "spreadsheet-a",
  sheetId: 7,
};

const RANGE: RangeReference = {
  service: "spreadsheet",
  kind: "range",
  spreadsheetId: "spreadsheet-a",
  sheetId: 7,
  row: 1,
  column: 1,
  numRows: 2,
  numColumns: 3,
};

function createStore() {
  return new InMemorySpreadsheetStore([
    {
      id: "spreadsheet-a",
      name: "Budget",
      sheets: [
        {
          id: 7,
          name: "Summary",
          maxRows: 10,
          maxColumns: 8,
          values: [
            ["Name", "Amount", 100],
            ["Vegas", 42, true],
          ],
        },
        {
          id: 9,
          name: "Archive",
          maxRows: 5,
          maxColumns: 5,
        },
      ],
    },
  ]);
}

describe("InMemorySpreadsheetStore resources", () => {
  test("resolve spreadsheet and sheet identity separately from metadata", async () => {
    const store = createStore();

    await expect(store.getSpreadsheet("spreadsheet-a")).resolves.toStrictEqual(SPREADSHEET);
    await expect(store.getSpreadsheetMetadata(SPREADSHEET)).resolves.toStrictEqual({
      name: "Budget",
    });
    await store.renameSpreadsheet(SPREADSHEET, "Forecast");
    await expect(store.getSpreadsheetMetadata(SPREADSHEET)).resolves.toStrictEqual({
      name: "Forecast",
    });

    await expect(store.listSheets(SPREADSHEET)).resolves.toStrictEqual([
      SUMMARY,
      {
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-a",
        sheetId: 9,
      },
    ]);
    await expect(store.getSheet(SPREADSHEET, 7)).resolves.toStrictEqual(SUMMARY);
    await expect(store.getSheet(SPREADSHEET, 999)).resolves.toBeNull();
    await expect(store.getSheetByName(SPREADSHEET, "Archive")).resolves.toStrictEqual({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 9,
    });
    await expect(store.getSheetByName(SPREADSHEET, "Missing")).resolves.toBeNull();
  });

  test("rename a Sheet without allowing duplicate sibling names", async () => {
    const store = createStore();

    await store.renameSheet(SUMMARY, "Overview");

    await expect(store.getSheetMetadata(SUMMARY)).resolves.toStrictEqual({
      name: "Overview",
      maxRows: 10,
      maxColumns: 8,
      frozenColumns: 0,
      frozenRows: 0,
      hidden: false,
      hiddenGridlines: false,
      rightToLeft: false,
      tabColor: null,
    });
    await expect(store.getSheetByName(SPREADSHEET, "Overview")).resolves.toStrictEqual(SUMMARY);
    await expect(store.getSheetByName(SPREADSHEET, "Summary")).resolves.toBeNull();

    await expect(store.renameSheet(SUMMARY, "Archive")).rejects.toThrow(
      "Duplicate local Spreadsheet sheet name: Archive",
    );
    await expect(store.getSheetMetadata(SUMMARY)).resolves.toStrictEqual({
      name: "Overview",
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

  test("persist Sheet display state with documented defaults", async () => {
    const store = createStore();

    await expect(store.getSheetMetadata(SUMMARY)).resolves.toMatchObject({
      frozenColumns: 0,
      frozenRows: 0,
      hidden: false,
      hiddenGridlines: false,
      rightToLeft: false,
      tabColor: null,
    });

    await store.setSheetFrozenColumns(SUMMARY, 2);
    await store.setSheetFrozenRows(SUMMARY, 3);
    await store.setSheetHidden(SUMMARY, true);
    await store.setSheetHiddenGridlines(SUMMARY, true);
    await store.setSheetRightToLeft(SUMMARY, true);
    await store.setSheetTabColor(SUMMARY, "#ff0000");

    await expect(store.getSheetMetadata(SUMMARY)).resolves.toMatchObject({
      frozenColumns: 2,
      frozenRows: 3,
      hidden: true,
      hiddenGridlines: true,
      rightToLeft: true,
      tabColor: "#ff0000",
    });

    await store.setSheetFrozenColumns(SUMMARY, 0);
    await store.setSheetFrozenRows(SUMMARY, 0);
    await store.setSheetHidden(SUMMARY, false);
    await store.setSheetTabColor(SUMMARY, null);
    await expect(store.getSheetMetadata(SUMMARY)).resolves.toMatchObject({
      frozenColumns: 0,
      frozenRows: 0,
      hidden: false,
      tabColor: null,
    });
  });

  test("persist user-hidden Sheet columns within local grid bounds", async () => {
    const store = createStore();

    await expect(store.isSheetColumnHiddenByUser(SUMMARY, 2)).resolves.toBe(false);

    await store.setSheetColumnsHidden(SUMMARY, 2, 3, true);

    await expect(store.isSheetColumnHiddenByUser(SUMMARY, 2)).resolves.toBe(true);
    await expect(store.isSheetColumnHiddenByUser(SUMMARY, 3)).resolves.toBe(true);
    await expect(store.isSheetColumnHiddenByUser(SUMMARY, 4)).resolves.toBe(true);
    await expect(store.isSheetColumnHiddenByUser(SUMMARY, 5)).resolves.toBe(false);

    await store.setSheetColumnsHidden(SUMMARY, 3, 2, false);

    await expect(store.isSheetColumnHiddenByUser(SUMMARY, 2)).resolves.toBe(true);
    await expect(store.isSheetColumnHiddenByUser(SUMMARY, 3)).resolves.toBe(false);
    await expect(store.isSheetColumnHiddenByUser(SUMMARY, 4)).resolves.toBe(false);

    await expect(store.setSheetColumnsHidden(SUMMARY, 0, 1, true)).rejects.toThrow(
      "column start must be a positive integer",
    );
    await expect(store.setSheetColumnsHidden(SUMMARY, 1, 0, true)).rejects.toThrow(
      "column count must be a positive integer",
    );
    await expect(store.setSheetColumnsHidden(SUMMARY, 8, 2, true)).rejects.toThrow(
      "columns must stay within 1 and 8",
    );
    await expect(store.isSheetColumnHiddenByUser(SUMMARY, 9)).rejects.toThrow(
      "columns must stay within 1 and 8",
    );
  });

  test("persist user-hidden Sheet rows within local grid bounds", async () => {
    const store = createStore();

    await expect(store.isSheetRowHiddenByUser(SUMMARY, 2)).resolves.toBe(false);
    await store.setSheetRowsHidden(SUMMARY, 2, 3, true);
    await expect(store.isSheetRowHiddenByUser(SUMMARY, 2)).resolves.toBe(true);
    await expect(store.isSheetRowHiddenByUser(SUMMARY, 3)).resolves.toBe(true);
    await expect(store.isSheetRowHiddenByUser(SUMMARY, 4)).resolves.toBe(true);
    await expect(store.isSheetRowHiddenByUser(SUMMARY, 5)).resolves.toBe(false);

    await store.setSheetRowsHidden(SUMMARY, 3, 2, false);
    await expect(store.isSheetRowHiddenByUser(SUMMARY, 2)).resolves.toBe(true);
    await expect(store.isSheetRowHiddenByUser(SUMMARY, 3)).resolves.toBe(false);
    await expect(store.isSheetRowHiddenByUser(SUMMARY, 4)).resolves.toBe(false);

    await expect(store.setSheetRowsHidden(SUMMARY, 0, 1, true)).rejects.toThrow(
      "row start must be a positive integer",
    );
    await expect(store.setSheetRowsHidden(SUMMARY, 1, 0, true)).rejects.toThrow(
      "row count must be a positive integer",
    );
    await expect(store.setSheetRowsHidden(SUMMARY, 10, 2, true)).rejects.toThrow(
      "rows must stay within 1 and 10",
    );
    await expect(store.isSheetRowHiddenByUser(SUMMARY, 11)).rejects.toThrow(
      "rows must stay within 1 and 10",
    );
  });

  test("reject invalid local frozen Sheet counts", async () => {
    const store = createStore();

    await expect(store.setSheetFrozenColumns(SUMMARY, -1)).rejects.toThrow(
      "frozen columns must be between 0 and 8",
    );
    await expect(store.setSheetFrozenColumns(SUMMARY, 9)).rejects.toThrow(
      "frozen columns must be between 0 and 8",
    );
    await expect(store.setSheetFrozenRows(SUMMARY, -1)).rejects.toThrow(
      "frozen rows must be between 0 and 10",
    );
    await expect(store.setSheetFrozenRows(SUMMARY, 11)).rejects.toThrow(
      "frozen rows must be between 0 and 10",
    );
    await expect(store.getSheetMetadata(SUMMARY)).resolves.toMatchObject({
      frozenColumns: 0,
      frozenRows: 0,
    });
  });

  test("reject hiding the only visible Sheet", async () => {
    const store = new InMemorySpreadsheetStore([
      {
        id: "spreadsheet-a",
        name: "Budget",
        sheets: [
          {
            id: 7,
            name: "Summary",
            maxRows: 10,
            maxColumns: 8,
          },
        ],
      },
    ]);

    await expect(store.setSheetHidden(SUMMARY, true)).rejects.toThrow();
    await expect(store.getSheetMetadata(SUMMARY)).resolves.toMatchObject({
      hidden: false,
    });
  });

  test("delegate Sheet grid operations to the owned grid", async () => {
    const store = createStore();

    await expect(store.getSheetDataBounds(SUMMARY)).resolves.toStrictEqual({
      lastRow: 2,
      lastColumn: 3,
    });
    await expect(store.getRangeValues(RANGE)).resolves.toStrictEqual([
      ["Name", "Amount", 100],
      ["Vegas", 42, true],
    ]);

    await store.setRangeValues(
      {
        ...RANGE,
        numRows: 1,
        numColumns: 1,
      },
      [["Updated"]],
    );

    await expect(
      store.getRangeValues({
        ...RANGE,
        numRows: 1,
        numColumns: 1,
      }),
    ).resolves.toStrictEqual([["Updated"]]);
  });

  test("reject unknown resources", async () => {
    const store = createStore();

    await expect(store.getSpreadsheet("missing")).rejects.toThrow(
      "Unknown local Spreadsheet: missing",
    );
  });

  test("reject duplicate resource identity in seed data", () => {
    expect(
      () =>
        new InMemorySpreadsheetStore([
          {
            id: "duplicate",
            name: "First",
            sheets: [],
          },
          {
            id: "duplicate",
            name: "Second",
            sheets: [],
          },
        ]),
    ).toThrow("Duplicate local Spreadsheet id: duplicate");
  });
});
