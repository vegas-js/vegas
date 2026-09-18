import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createSpreadsheetApp,
  createSpreadsheetObjectHydrator,
  Range,
  Sheet,
  Spreadsheet,
  SpreadsheetApp,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type HydratedSpreadsheetObject,
  type RangeReference,
  type SheetReference,
  type SpreadsheetReference,
} from "./index";

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #respond: (call: HostCall) => unknown;

  constructor(respond: (call: HostCall) => unknown) {
    this.#respond = respond;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);
    return this.#respond(call) as HostCallResult<C>;
  }
}

function createBridge() {
  return new RecordingHostBridge((call) => {
    if (call.service !== "spreadsheet") {
      throw new Error(`unexpected service: ${call.service}`);
    }

    switch (call.operation) {
      case "get-spreadsheet": {
        return {
          service: "spreadsheet",
          kind: "spreadsheet",
          id: call.id,
        } satisfies SpreadsheetReference;
      }
      case "get-spreadsheet-metadata": {
        return {
          name: "Budget",
        };
      }
      case "list-sheets": {
        return [
          {
            service: "spreadsheet",
            kind: "sheet",
            spreadsheetId: call.spreadsheet.id,
            sheetId: 7,
          },
          {
            service: "spreadsheet",
            kind: "sheet",
            spreadsheetId: call.spreadsheet.id,
            sheetId: 9,
          },
        ] satisfies SheetReference[];
      }
      case "get-sheet-by-name": {
        if (call.name === "Missing") {
          return null;
        }

        return {
          service: "spreadsheet",
          kind: "sheet",
          spreadsheetId: call.spreadsheet.id,
          sheetId: 7,
        } satisfies SheetReference;
      }
      case "get-sheet-metadata": {
        return {
          name: "Summary",
          maxRows: 100,
          maxColumns: 26,
        };
      }
      case "get-range-values": {
        return [
          ["Vegas", new Date("2026-09-18T00:00:00.000Z")],
          [42, true],
        ];
      }
      case "set-range-values": {
        return undefined;
      }
      case "get-sheet": {
        throw new Error("unexpected get-sheet call");
      }
    }
  });
}

describe("Spreadsheet Runtime objects", () => {
  test("map each reference kind to its Runtime public object Class", () => {
    expectTypeOf<HydratedSpreadsheetObject<SpreadsheetReference>>().toEqualTypeOf<Spreadsheet>();
    expectTypeOf<HydratedSpreadsheetObject<SheetReference>>().toEqualTypeOf<Sheet>();
    expectTypeOf<HydratedSpreadsheetObject<RangeReference>>().toEqualTypeOf<Range>();
  });

  test("open Spreadsheet resources and hydrate Sheet chains", () => {
    const bridge = createBridge();
    const spreadsheetApp = createSpreadsheetApp(bridge);

    expect(spreadsheetApp).toBeInstanceOf(SpreadsheetApp);

    const spreadsheet = spreadsheetApp.openById("spreadsheet-a");
    expect(spreadsheet).toBeInstanceOf(Spreadsheet);
    expect(spreadsheet.getId()).toBe("spreadsheet-a");
    expect(spreadsheet.getName()).toBe("Budget");

    const sheets = spreadsheet.getSheets();
    expect(sheets).toHaveLength(2);
    expect(sheets[0]).toBeInstanceOf(Sheet);
    expect(sheets[0]?.getSheetId()).toBe(7);

    const summary = spreadsheet.getSheetByName("Summary");
    expect(summary).toBeInstanceOf(Sheet);
    expect(summary?.getName()).toBe("Summary");
    expect(summary?.getMaxRows()).toBe(100);
    expect(summary?.getMaxColumns()).toBe(26);

    expect(spreadsheet.getSheetByName("Missing")).toBeNull();
  });

  test("construct numeric Ranges locally and read values through the HostBridge", () => {
    const bridge = createBridge();
    const spreadsheet = createSpreadsheetApp(bridge).openById("spreadsheet-a");
    const sheet = spreadsheet.getSheetByName("Summary");

    if (sheet === null) {
      throw new Error("expected Summary sheet");
    }

    const range = sheet.getRange(2, 3, 2, 2);

    expect(range).toBeInstanceOf(Range);
    expect(range.getRow()).toBe(2);
    expect(range.getColumn()).toBe(3);
    expect(range.getNumRows()).toBe(2);
    expect(range.getNumColumns()).toBe(2);
    expect(range.getSheet()).toBeInstanceOf(Sheet);
    expect(range.getValues()).toStrictEqual([
      ["Vegas", new Date("2026-09-18T00:00:00.000Z")],
      [42, true],
    ]);
    expect(range.getValue()).toBe("Vegas");

    const values = range.getValues();
    const date = values[0]?.[1];
    expect(date).toBeInstanceOf(Date);

    if (!(date instanceof Date)) {
      throw new Error("expected Date value");
    }

    date.setUTCFullYear(2030);

    expect(range.getValues()[0]?.[1]).toStrictEqual(new Date("2026-09-18T00:00:00.000Z"));
  });

  test("format Range coordinates as A1 notation without HostBridge calls", () => {
    const bridge = createBridge();
    const hydrator = createSpreadsheetObjectHydrator(bridge);
    const cases = [
      [1, 1, 1, 1, "A1"],
      [5, 26, 1, 1, "Z5"],
      [5, 27, 1, 1, "AA5"],
      [5, 52, 1, 1, "AZ5"],
      [5, 53, 3, 2, "BA5:BB7"],
      [1, 1, 2, 5, "A1:E2"],
    ] as const;

    for (const [row, column, numRows, numColumns, expected] of cases) {
      const range = hydrator.hydrate({
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row,
        column,
        numRows,
        numColumns,
      });

      expect(range.getA1Notation()).toBe(expected);
      expect(range.getLastColumn()).toBe(column + numColumns - 1);
      expect(range.getLastRow()).toBe(row + numRows - 1);
    }

    expect(bridge.calls).toHaveLength(0);
  });

  test("resolve cells relative to a Range without HostBridge calls", () => {
    const bridge = createBridge();
    const hydrator = createSpreadsheetObjectHydrator(bridge);
    const range = hydrator.hydrate({
      service: "spreadsheet",
      kind: "range",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
      row: 2,
      column: 2,
      numRows: 3,
      numColumns: 3,
    });

    expect(range.getCell(1, 1).getA1Notation()).toBe("B2");
    expect(range.getCell(2, 2).getA1Notation()).toBe("C3");
    expect(range.getCell(3, 3).getA1Notation()).toBe("D4");
    expect(bridge.calls).toHaveLength(0);
  });

  test("reject cell coordinates outside the Range before creating an object", () => {
    const bridge = createBridge();
    const hydrator = createSpreadsheetObjectHydrator(bridge);
    const range = hydrator.hydrate({
      service: "spreadsheet",
      kind: "range",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
      row: 2,
      column: 2,
      numRows: 3,
      numColumns: 3,
    });

    expect(() => range.getCell(0, 1)).toThrow("cell row must be a positive integer");
    expect(() => range.getCell(1, 0)).toThrow("cell column must be a positive integer");
    expect(() => range.getCell(1.5, 1)).toThrow("cell row must be a positive integer");
    expect(() => range.getCell(4, 1)).toThrow("outside the range");
    expect(() => range.getCell(1, 4)).toThrow("outside the range");
    expect(bridge.calls).toHaveLength(0);
  });

  test("offset Ranges locally with Apps Script overload semantics", () => {
    const bridge = createBridge();
    const hydrator = createSpreadsheetObjectHydrator(bridge);
    const range = hydrator.hydrate({
      service: "spreadsheet",
      kind: "range",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
      row: 5,
      column: 5,
      numRows: 2,
      numColumns: 3,
    });

    const sameSize = range.offset(-2, 1);

    expect(sameSize).not.toBe(range);
    expect(sameSize.getA1Notation()).toBe("F3:H4");
    expect(range.offset(1, -2, 4).getA1Notation()).toBe("C6:E9");
    expect(range.offset(-4, -4, 3, 2).getA1Notation()).toBe("A1:B3");
    expect(bridge.calls).toHaveLength(0);
  });

  test("reject invalid Range offsets before creating an object", () => {
    const bridge = createBridge();
    const hydrator = createSpreadsheetObjectHydrator(bridge);
    const range = hydrator.hydrate({
      service: "spreadsheet",
      kind: "range",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
      row: 5,
      column: 5,
      numRows: 2,
      numColumns: 3,
    });

    expect(() => range.offset(0.5, 0)).toThrow("rowOffset must be an integer");
    expect(() => range.offset(0, 0.5)).toThrow("columnOffset must be an integer");
    expect(() => range.offset(-5, 0)).toThrow("row must be a positive integer");
    expect(() => range.offset(0, -5)).toThrow("column must be a positive integer");
    expect(() => range.offset(0, 0, 0)).toThrow("numRows must be a positive integer");
    expect(() => range.offset(0, 0, 1, 0)).toThrow("numColumns must be a positive integer");
    expect(bridge.calls).toHaveLength(0);
  });

  test("clear Range content through the HostBridge and preserve chaining", () => {
    const bridge = createBridge();
    const spreadsheet = createSpreadsheetApp(bridge).openById("spreadsheet-a");
    const sheet = spreadsheet.getSheetByName("Summary");

    if (sheet === null) {
      throw new Error("expected Summary sheet");
    }

    const range = sheet.getRange(2, 3, 2, 2);
    const result = range.clearContent();

    expect(result).toBe(range);
    expect(bridge.calls.at(-1)).toStrictEqual({
      service: "spreadsheet",
      operation: "set-range-values",
      range: {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 2,
        column: 3,
        numRows: 2,
        numColumns: 2,
      },
      values: [
        ["", ""],
        ["", ""],
      ],
    });
  });

  test("write a single Range value through the HostBridge and preserve chaining", () => {
    const bridge = createBridge();
    const spreadsheet = createSpreadsheetApp(bridge).openById("spreadsheet-a");
    const sheet = spreadsheet.getSheetByName("Summary");

    if (sheet === null) {
      throw new Error("expected Summary sheet");
    }

    const range = sheet.getRange(2, 3);
    const result = range.setValue("Updated");

    expect(result).toBe(range);
    expect(bridge.calls.at(-1)).toStrictEqual({
      service: "spreadsheet",
      operation: "set-range-values",
      range: {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 2,
        column: 3,
        numRows: 1,
        numColumns: 1,
      },
      values: [["Updated"]],
    });
  });

  test("write Range grids through the HostBridge and preserve chaining", () => {
    const bridge = createBridge();
    const spreadsheet = createSpreadsheetApp(bridge).openById("spreadsheet-a");
    const sheet = spreadsheet.getSheetByName("Summary");

    if (sheet === null) {
      throw new Error("expected Summary sheet");
    }

    const range = sheet.getRange(1, 1, 2, 2);
    const result = range.setValues([
      ["Updated", 100],
      ["Second", 200],
    ]);

    expect(result).toBe(range);
    expect(bridge.calls.at(-1)).toStrictEqual({
      service: "spreadsheet",
      operation: "set-range-values",
      range: {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 1,
        column: 1,
        numRows: 2,
        numColumns: 2,
      },
      values: [
        ["Updated", 100],
        ["Second", 200],
      ],
    });
  });

  test("reject invalid numeric Range coordinates before creating an object", () => {
    const bridge = createBridge();
    const spreadsheet = createSpreadsheetApp(bridge).openById("spreadsheet-a");
    const sheet = spreadsheet.getSheetByName("Summary");

    if (sheet === null) {
      throw new Error("expected Summary sheet");
    }

    expect(() => sheet.getRange(0, 1)).toThrow("row must be a positive integer");
    expect(() => sheet.getRange(1, 0)).toThrow("column must be a positive integer");
    expect(() => sheet.getRange(1, 1, 0)).toThrow("numRows must be a positive integer");
    expect(() => sheet.getRange(1, 1, 1, 0)).toThrow("numColumns must be a positive integer");
  });
});
