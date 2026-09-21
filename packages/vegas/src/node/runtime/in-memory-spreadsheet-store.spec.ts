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
      url: "http://localhost:5173/spreadsheets/spreadsheet-a",
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

  test("clone all mutable Spreadsheet state without sharing mutations", async () => {
    const store = createStore();
    const singleCellRange = {
      ...RANGE,
      numRows: 1,
      numColumns: 1,
    };

    await store.renameSpreadsheet(SPREADSHEET, "Forecast");
    await store.renameSheet(SUMMARY, "Overview");
    await store.setSheetFrozenColumns(SUMMARY, 2);
    await store.setSheetFrozenRows(SUMMARY, 3);
    await store.setSheetHiddenGridlines(SUMMARY, true);
    await store.setSheetRightToLeft(SUMMARY, true);
    await store.setSheetTabColor(SUMMARY, "#ff0000");
    await store.setSheetColumnsHidden(SUMMARY, 2, 1, true);
    await store.setSheetRowsHidden(SUMMARY, 2, 1, true);
    await store.setRangeValues(singleCellRange, [["before clone"]]);
    await store.setRangeNotes(singleCellRange, [["before clone"]]);

    const runtimeCreated = await store.createSpreadsheet("Runtime created", 3, 4);
    const clone = store.clone();

    await expect(clone.getSpreadsheetMetadata(SPREADSHEET)).resolves.toStrictEqual({
      name: "Forecast",
    });
    await expect(clone.getSheetMetadata(SUMMARY)).resolves.toMatchObject({
      name: "Overview",
      frozenColumns: 2,
      frozenRows: 3,
      hiddenGridlines: true,
      rightToLeft: true,
      tabColor: "#ff0000",
    });
    await expect(clone.isSheetColumnHiddenByUser(SUMMARY, 2)).resolves.toBe(true);
    await expect(clone.isSheetRowHiddenByUser(SUMMARY, 2)).resolves.toBe(true);
    await expect(clone.getRangeValues(singleCellRange)).resolves.toStrictEqual([["before clone"]]);
    await expect(clone.getRangeNotes(singleCellRange)).resolves.toStrictEqual([["before clone"]]);
    await expect(clone.getSpreadsheet(runtimeCreated.id)).resolves.toStrictEqual(runtimeCreated);

    await store.setRangeValues(singleCellRange, [["original update"]]);
    await clone.setRangeValues(singleCellRange, [["clone update"]]);

    await expect(store.getRangeValues(singleCellRange)).resolves.toStrictEqual([
      ["original update"],
    ]);
    await expect(clone.getRangeValues(singleCellRange)).resolves.toStrictEqual([["clone update"]]);

    await expect(clone.createSpreadsheet("Clone next", 1, 1)).resolves.toMatchObject({
      id: "spreadsheet:2",
    });
    await expect(store.createSpreadsheet("Original next", 1, 1)).resolves.toMatchObject({
      id: "spreadsheet:2",
    });
  });

  test("replace and remove fixture-owned Spreadsheets without changing runtime-created resources", async () => {
    const store = createStore();
    const singleCellRange = {
      ...RANGE,
      numRows: 1,
      numColumns: 1,
    };

    await store.setRangeValues(singleCellRange, [["runtime mutation"]]);
    await store.setRangeNotes(singleCellRange, [["runtime note"]]);
    const runtimeCreated = await store.createSpreadsheet("Runtime created", 2, 2);

    store.replaceFixtureSpreadsheet({
      id: "spreadsheet-a",
      url: "http://localhost:5173/spreadsheets/reloaded",
      name: "Reloaded",
      sheets: [
        {
          id: 7,
          name: "Reloaded sheet",
          maxRows: 2,
          maxColumns: 2,
          values: [["fixture reload"]],
        },
      ],
    });

    await expect(store.getSpreadsheetMetadata(SPREADSHEET)).resolves.toStrictEqual({
      name: "Reloaded",
    });
    await expect(store.getRangeValues(singleCellRange)).resolves.toStrictEqual([
      ["fixture reload"],
    ]);
    await expect(store.getRangeNotes(singleCellRange)).resolves.toStrictEqual([[""]]);
    await expect(
      store.getSpreadsheetByUrl("http://localhost:5173/spreadsheets/spreadsheet-a"),
    ).rejects.toThrow("Unknown local Spreadsheet URL");
    await expect(
      store.getSpreadsheetByUrl("http://localhost:5173/spreadsheets/reloaded"),
    ).resolves.toStrictEqual(SPREADSHEET);
    await expect(store.getSpreadsheet(runtimeCreated.id)).resolves.toStrictEqual(runtimeCreated);

    store.removeFixtureSpreadsheet("spreadsheet-a");

    await expect(store.getSpreadsheet("spreadsheet-a")).rejects.toThrow(
      "Unknown local Spreadsheet: spreadsheet-a",
    );
    await expect(
      store.getSpreadsheetByUrl("http://localhost:5173/spreadsheets/reloaded"),
    ).rejects.toThrow("Unknown local Spreadsheet URL");
    await expect(store.getSpreadsheet(runtimeCreated.id)).resolves.toStrictEqual(runtimeCreated);
  });

  test("reject fixture operations that would take ownership of runtime-created resources", async () => {
    const store = createStore();
    const runtimeCreated = await store.createSpreadsheet("Runtime created", 2, 2);

    expect(() =>
      store.replaceFixtureSpreadsheet({
        id: runtimeCreated.id,
        name: "Fixture collision",
        sheets: [],
      }),
    ).toThrow(
      `Cannot replace runtime-created local Spreadsheet with fixture: ${runtimeCreated.id}`,
    );

    expect(() => store.removeFixtureSpreadsheet(runtimeCreated.id)).toThrow(
      `Cannot remove runtime-created local Spreadsheet as fixture: ${runtimeCreated.id}`,
    );

    expect(() =>
      store.replaceFixtureSpreadsheet({
        id: "replacement",
        url: "http://localhost:5173/spreadsheets/spreadsheet-a",
        name: "URL collision",
        sheets: [],
      }),
    ).toThrow("Duplicate local Spreadsheet URL: http://localhost:5173/spreadsheets/spreadsheet-a");

    await expect(store.getSpreadsheet(runtimeCreated.id)).resolves.toStrictEqual(runtimeCreated);
    await expect(store.getSpreadsheet("spreadsheet-a")).resolves.toStrictEqual(SPREADSHEET);
  });

  test("preserve Spreadsheet ownership when cloning local state", async () => {
    const store = createStore();
    const runtimeCreated = await store.createSpreadsheet("Runtime created", 2, 2);
    const clone = store.clone();

    clone.removeFixtureSpreadsheet("spreadsheet-a");

    expect(() => clone.removeFixtureSpreadsheet(runtimeCreated.id)).toThrow(
      `Cannot remove runtime-created local Spreadsheet as fixture: ${runtimeCreated.id}`,
    );

    await expect(store.getSpreadsheet("spreadsheet-a")).resolves.toStrictEqual(SPREADSHEET);
    await expect(clone.getSpreadsheet(runtimeCreated.id)).resolves.toStrictEqual(runtimeCreated);
  });

  test("resolve explicit local URLs and Google Sheets URLs", async () => {
    const store = createStore();

    await expect(
      store.getSpreadsheetByUrl("http://localhost:5173/spreadsheets/spreadsheet-a"),
    ).resolves.toStrictEqual(SPREADSHEET);
    await expect(
      store.getSpreadsheetByUrl("https://docs.google.com/spreadsheets/d/spreadsheet-a/edit#gid=7"),
    ).resolves.toStrictEqual(SPREADSHEET);
  });

  test("reject unknown Spreadsheet URLs", async () => {
    const store = createStore();

    await expect(
      store.getSpreadsheetByUrl("http://localhost:5173/spreadsheets/missing"),
    ).rejects.toThrow("Unknown local Spreadsheet URL: http://localhost:5173/spreadsheets/missing");
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

    expect(
      () =>
        new InMemorySpreadsheetStore([
          {
            id: "first",
            url: "http://localhost:5173/spreadsheets/shared",
            name: "First",
            sheets: [],
          },
          {
            id: "second",
            url: "http://localhost:5173/spreadsheets/shared",
            name: "Second",
            sheets: [],
          },
        ]),
    ).toThrow("Duplicate local Spreadsheet URL: http://localhost:5173/spreadsheets/shared");
  });
});
