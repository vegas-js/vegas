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
    });

    await store.setSheetFrozenColumns(SUMMARY, 2);
    await store.setSheetFrozenRows(SUMMARY, 3);
    await store.setSheetHidden(SUMMARY, true);
    await store.setSheetHiddenGridlines(SUMMARY, true);
    await store.setSheetRightToLeft(SUMMARY, true);

    await expect(store.getSheetMetadata(SUMMARY)).resolves.toMatchObject({
      frozenColumns: 2,
      frozenRows: 3,
      hidden: true,
      hiddenGridlines: true,
      rightToLeft: true,
    });

    await store.setSheetFrozenColumns(SUMMARY, 0);
    await store.setSheetFrozenRows(SUMMARY, 0);
    await store.setSheetHidden(SUMMARY, false);
    await expect(store.getSheetMetadata(SUMMARY)).resolves.toMatchObject({
      frozenColumns: 0,
      frozenRows: 0,
      hidden: false,
    });
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
