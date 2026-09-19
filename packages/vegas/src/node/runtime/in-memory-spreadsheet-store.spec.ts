import { describe, expect, test } from "vitest";

import { InMemorySpreadsheetStore, type RangeReference, type SpreadsheetReference } from "./index";

const SPREADSHEET: SpreadsheetReference = {
  service: "spreadsheet",
  kind: "spreadsheet",
  id: "spreadsheet-a",
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

function createStore(date = new Date("2026-09-18T00:00:00.000Z")) {
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
            ["Name", "Amount", date],
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
      {
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
      },
      {
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-a",
        sheetId: 9,
      },
    ]);
    await expect(store.getSheet(SPREADSHEET, 7)).resolves.toStrictEqual({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });
    await expect(store.getSheet(SPREADSHEET, 999)).resolves.toBeNull();
    await expect(store.getSheetByName(SPREADSHEET, "Archive")).resolves.toStrictEqual({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 9,
    });
    await expect(store.getSheetByName(SPREADSHEET, "Missing")).resolves.toBeNull();
    await expect(
      store.getSheetDataBounds({
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
      }),
    ).resolves.toStrictEqual({
      lastRow: 2,
      lastColumn: 3,
    });
    await expect(
      store.getSheetDataBounds({
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-a",
        sheetId: 9,
      }),
    ).resolves.toStrictEqual({ lastRow: null, lastColumn: null });
  });

  test("rename a Sheet without allowing duplicate sibling names", async () => {
    const store = createStore();
    const sheet = {
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    } as const;

    await store.renameSheet(sheet, "Overview");

    await expect(store.getSheetMetadata(sheet)).resolves.toStrictEqual({
      name: "Overview",
      maxRows: 10,
      maxColumns: 8,
      hiddenGridlines: false,
      rightToLeft: false,
    });
    await expect(store.getSheetByName(SPREADSHEET, "Overview")).resolves.toStrictEqual(sheet);
    await expect(store.getSheetByName(SPREADSHEET, "Summary")).resolves.toBeNull();

    await expect(store.renameSheet(sheet, "Archive")).rejects.toThrow(
      "Duplicate local Spreadsheet sheet name: Archive",
    );
    await expect(store.getSheetMetadata(sheet)).resolves.toStrictEqual({
      name: "Overview",
      maxRows: 10,
      maxColumns: 8,
      hiddenGridlines: false,
      rightToLeft: false,
    });
  });

  test("persist Sheet display state with documented defaults", async () => {
    const store = createStore();
    const sheet = {
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    } as const;

    await expect(store.getSheetMetadata(sheet)).resolves.toMatchObject({
      hiddenGridlines: false,
      rightToLeft: false,
    });

    await store.setSheetHiddenGridlines(sheet, true);
    await store.setSheetRightToLeft(sheet, true);

    await expect(store.getSheetMetadata(sheet)).resolves.toMatchObject({
      hiddenGridlines: true,
      rightToLeft: true,
    });
  });

  test("return seeded values, empty strings for blank cells, and detached Dates", async () => {
    const seedDate = new Date("2026-09-18T00:00:00.000Z");
    const store = createStore(seedDate);

    seedDate.setUTCFullYear(2030);

    const values = await store.getRangeValues({
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

    await expect(store.getRangeValues(RANGE)).resolves.toStrictEqual([
      ["Name", "Amount", new Date("2026-09-18T00:00:00.000Z")],
      ["Vegas", 42, true],
    ]);
  });

  test("write an exact rectangular range without retaining mutable Date inputs", async () => {
    const store = createStore();
    const date = new Date("2026-09-19T00:00:00.000Z");

    await store.setRangeValues(RANGE, [
      ["Updated", 100, date],
      ["Second", false, ""],
    ]);

    date.setUTCFullYear(2030);

    await expect(store.getRangeValues(RANGE)).resolves.toStrictEqual([
      ["Updated", 100, new Date("2026-09-19T00:00:00.000Z")],
      ["Second", false, ""],
    ]);
  });

  test("reject mismatched value dimensions before changing any cells", async () => {
    const store = createStore();

    await expect(
      store.setRangeValues(RANGE, [
        ["Changed", 1],
        ["Too", "Short"],
      ]),
    ).rejects.toThrow("dimensions must match");

    await expect(store.getRangeValues(RANGE)).resolves.toStrictEqual([
      ["Name", "Amount", new Date("2026-09-18T00:00:00.000Z")],
      ["Vegas", 42, true],
    ]);
  });

  test("reject unknown resources and ranges outside sheet bounds", async () => {
    const store = createStore();

    await expect(store.getSpreadsheet("missing")).rejects.toThrow(
      "Unknown local Spreadsheet: missing",
    );
    await expect(
      store.getRangeValues({
        ...RANGE,
        row: 10,
        numRows: 2,
      }),
    ).rejects.toThrow("outside sheet bounds");
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
