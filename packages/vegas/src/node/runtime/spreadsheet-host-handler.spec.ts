import { describe, expect, test } from "vitest";

import { InMemorySpreadsheetStore, SpreadsheetHostHandler } from "./index";

function createHandler() {
  return new SpreadsheetHostHandler(
    new InMemorySpreadsheetStore([
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
              ["Name", "Amount"],
              ["Vegas", 42],
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
    ]),
  );
}

describe("SpreadsheetHostHandler", () => {
  test("delegate resource lookup and metadata to the store", async () => {
    const handler = createHandler();
    const spreadsheet = await handler.handle({
      service: "spreadsheet",
      operation: "get-spreadsheet",
      id: "spreadsheet-a",
    });

    expect(spreadsheet).toStrictEqual({
      service: "spreadsheet",
      kind: "spreadsheet",
      id: "spreadsheet-a",
    });

    if (spreadsheet === null || typeof spreadsheet !== "object" || !("kind" in spreadsheet)) {
      throw new Error("expected Spreadsheet reference");
    }

    if (spreadsheet.kind !== "spreadsheet") {
      throw new Error("expected Spreadsheet reference");
    }

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-spreadsheet-metadata",
        spreadsheet,
      }),
    ).resolves.toStrictEqual({
      name: "Budget",
    });
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "rename-spreadsheet",
        spreadsheet,
        name: "Forecast",
      }),
    ).resolves.toBeUndefined();
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-spreadsheet-metadata",
        spreadsheet,
      }),
    ).resolves.toStrictEqual({
      name: "Forecast",
    });
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet",
        spreadsheet,
        sheetId: 7,
      }),
    ).resolves.toStrictEqual({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet",
        spreadsheet,
        sheetId: 999,
      }),
    ).resolves.toBeNull();
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-by-name",
        spreadsheet,
        name: "Summary",
      }),
    ).resolves.toStrictEqual({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });
    const sheet = {
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    } as const;
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-metadata",
        sheet,
      }),
    ).resolves.toStrictEqual({
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
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "set-sheet-frozen-columns",
        sheet,
        columns: 2,
      }),
    ).resolves.toBeUndefined();
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "set-sheet-frozen-rows",
        sheet,
        rows: 3,
      }),
    ).resolves.toBeUndefined();
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "set-sheet-hidden",
        sheet,
        hidden: true,
      }),
    ).resolves.toBeUndefined();
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "set-sheet-hidden-gridlines",
        sheet,
        hidden: true,
      }),
    ).resolves.toBeUndefined();
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "set-sheet-right-to-left",
        sheet,
        rightToLeft: true,
      }),
    ).resolves.toBeUndefined();
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "set-sheet-tab-color",
        sheet,
        tabColor: "#ff0000",
      }),
    ).resolves.toBeUndefined();
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-metadata",
        sheet,
      }),
    ).resolves.toMatchObject({
      frozenColumns: 2,
      frozenRows: 3,
      hidden: true,
      hiddenGridlines: true,
      rightToLeft: true,
      tabColor: "#ff0000",
    });
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "rename-sheet",
        sheet: {
          service: "spreadsheet",
          kind: "sheet",
          spreadsheetId: "spreadsheet-a",
          sheetId: 7,
        },
        name: "Overview",
      }),
    ).resolves.toBeUndefined();
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-by-name",
        spreadsheet,
        name: "Overview",
      }),
    ).resolves.toStrictEqual({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-data-bounds",
        sheet: {
          service: "spreadsheet",
          kind: "sheet",
          spreadsheetId: "spreadsheet-a",
          sheetId: 7,
        },
      }),
    ).resolves.toStrictEqual({ lastRow: 2, lastColumn: 2 });
  });

  test("delegate user-hidden Sheet column state to the store", async () => {
    const handler = createHandler();
    const sheet = {
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    } as const;

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-column-hidden-by-user",
        sheet,
        column: 2,
      }),
    ).resolves.toBe(false);

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "set-sheet-columns-hidden",
        sheet,
        startColumn: 2,
        numColumns: 2,
        hidden: true,
      }),
    ).resolves.toBeUndefined();

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-column-hidden-by-user",
        sheet,
        column: 2,
      }),
    ).resolves.toBe(true);
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-column-hidden-by-user",
        sheet,
        column: 3,
      }),
    ).resolves.toBe(true);

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "set-sheet-columns-hidden",
        sheet,
        startColumn: 2,
        numColumns: 1,
        hidden: false,
      }),
    ).resolves.toBeUndefined();

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-column-hidden-by-user",
        sheet,
        column: 2,
      }),
    ).resolves.toBe(false);
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-column-hidden-by-user",
        sheet,
        column: 3,
      }),
    ).resolves.toBe(true);
  });

  test("delegate user-hidden Sheet row state to the store", async () => {
    const handler = createHandler();
    const sheet = {
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    } as const;

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-row-hidden-by-user",
        sheet,
        row: 2,
      }),
    ).resolves.toBe(false);

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "set-sheet-rows-hidden",
        sheet,
        startRow: 2,
        numRows: 2,
        hidden: true,
      }),
    ).resolves.toBeUndefined();

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-row-hidden-by-user",
        sheet,
        row: 2,
      }),
    ).resolves.toBe(true);
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-row-hidden-by-user",
        sheet,
        row: 3,
      }),
    ).resolves.toBe(true);

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "set-sheet-rows-hidden",
        sheet,
        startRow: 2,
        numRows: 1,
        hidden: false,
      }),
    ).resolves.toBeUndefined();

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-row-hidden-by-user",
        sheet,
        row: 2,
      }),
    ).resolves.toBe(false);
    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-sheet-row-hidden-by-user",
        sheet,
        row: 3,
      }),
    ).resolves.toBe(true);
  });

  test("delegate Range reads and writes to the store", async () => {
    const handler = createHandler();
    const range = {
      service: "spreadsheet",
      kind: "range",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
      row: 1,
      column: 1,
      numRows: 2,
      numColumns: 2,
    } as const;

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-range-values",
        range,
      }),
    ).resolves.toStrictEqual([
      ["Name", "Amount"],
      ["Vegas", 42],
    ]);

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "set-range-values",
        range,
        values: [
          ["Updated", 100],
          ["Second", 200],
        ],
      }),
    ).resolves.toBeUndefined();

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-range-values",
        range,
      }),
    ).resolves.toStrictEqual([
      ["Updated", 100],
      ["Second", 200],
    ]);
  });
});
