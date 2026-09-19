import { describe, expect, test } from "vitest";

import {
  createSpreadsheetObjectHydrator,
  Spreadsheet,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type SheetReference,
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
      case "list-sheets":
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
      case "get-sheet-metadata":
        return {
          name: "Summary",
          maxRows: 100,
          maxColumns: 26,
          hiddenGridlines: false,
          rightToLeft: false,
        };
      case "get-range-values":
        return [
          ["Vegas", new Date("2026-09-18T00:00:00.000Z")],
          [42, true],
        ];
      case "set-range-values":
        return undefined;
      default:
        throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    }
  });
}

describe("Sheet", () => {
  test("hydrate a Sheet parent Spreadsheet without HostBridge calls", () => {
    const bridge = createBridge();
    const hydrator = createSpreadsheetObjectHydrator(bridge);
    const sheet = hydrator.hydrate({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });

    const parent = sheet.getParent();

    expect(parent).toBeInstanceOf(Spreadsheet);
    expect(parent.getId()).toBe("spreadsheet-a");
    expect(bridge.calls).toHaveLength(0);
  });

  test("resolve the 1-based Sheet index from parent sheet order", () => {
    const bridge = createBridge();
    const hydrator = createSpreadsheetObjectHydrator(bridge);
    const sheet = hydrator.hydrate({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 9,
    });

    expect(sheet.getIndex()).toBe(2);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "list-sheets",
        spreadsheet: {
          service: "spreadsheet",
          kind: "spreadsheet",
          id: "spreadsheet-a",
        },
      },
    ]);
  });

  test("reject a Sheet reference that is absent from its parent", () => {
    const bridge = createBridge();
    const sheet = createSpreadsheetObjectHydrator(bridge).hydrate({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 999,
    });

    expect(() => sheet.getIndex()).toThrow("Spreadsheet sheet is not present in its parent.");
  });

  test("read and update Sheet display state through the HostBridge", () => {
    let hiddenGridlines = false;
    let rightToLeft = false;
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet") {
        throw new Error(`unexpected service: ${call.service}`);
      }

      switch (call.operation) {
        case "get-sheet-metadata":
          return {
            name: "Summary",
            maxRows: 100,
            maxColumns: 26,
            hiddenGridlines,
            rightToLeft,
          };
        case "set-sheet-hidden-gridlines":
          hiddenGridlines = call.hidden;
          return undefined;
        case "set-sheet-right-to-left":
          rightToLeft = call.rightToLeft;
          return undefined;
        default:
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }
    });
    const sheet = createSpreadsheetObjectHydrator(bridge).hydrate({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });

    expect(sheet.hasHiddenGridlines()).toBe(false);
    expect(sheet.isRightToLeft()).toBe(false);
    expect(sheet.setHiddenGridlines(true)).toBe(sheet);
    expect(sheet.setRightToLeft(true)).toBe(sheet);
    expect(sheet.hasHiddenGridlines()).toBe(true);
    expect(sheet.isRightToLeft()).toBe(true);
    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-sheet-metadata",
      "get-sheet-metadata",
      "set-sheet-hidden-gridlines",
      "set-sheet-right-to-left",
      "get-sheet-metadata",
      "get-sheet-metadata",
    ]);
  });

  test("rename a Sheet through the HostBridge and preserve chaining", () => {
    let name = "Summary";
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet") {
        throw new Error(`unexpected service: ${call.service}`);
      }

      switch (call.operation) {
        case "get-sheet-metadata":
          return {
            name,
            maxRows: 100,
            maxColumns: 26,
            hiddenGridlines: false,
            rightToLeft: false,
          };
        case "rename-sheet":
          name = call.name;
          return undefined;
        default:
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }
    });
    const sheet = createSpreadsheetObjectHydrator(bridge).hydrate({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });

    expect(sheet.getName()).toBe("Summary");
    expect(sheet.setName("Overview")).toBe(sheet);
    expect(sheet.getName()).toBe("Overview");
    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-sheet-metadata",
      "rename-sheet",
      "get-sheet-metadata",
    ]);
  });

  test("clear Sheet contents through the existing data bounds and Range paths", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet") {
        throw new Error(`unexpected service: ${call.service}`);
      }

      switch (call.operation) {
        case "get-sheet-data-bounds":
          return {
            lastRow: 2,
            lastColumn: 3,
          };
        case "set-range-values":
          return undefined;
        default:
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }
    });
    const sheet = createSpreadsheetObjectHydrator(bridge).hydrate({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });

    const result = sheet.clearContents();

    expect(result).toBe(sheet);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "get-sheet-data-bounds",
        sheet: {
          service: "spreadsheet",
          kind: "sheet",
          spreadsheetId: "spreadsheet-a",
          sheetId: 7,
        },
      },
      {
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
          numColumns: 3,
        },
        values: [
          ["", "", ""],
          ["", "", ""],
        ],
      },
    ]);
  });

  test("leave an empty Sheet unchanged when clearing contents", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "spreadsheet" && call.operation === "get-sheet-data-bounds") {
        return {
          lastRow: null,
          lastColumn: null,
        };
      }

      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    });
    const sheet = createSpreadsheetObjectHydrator(bridge).hydrate({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });

    expect(sheet.clearContents()).toBe(sheet);
    expect(bridge.calls).toHaveLength(1);
    expect(bridge.calls[0]?.operation).toBe("get-sheet-data-bounds");
  });

  test("read Sheet values through the existing Range HostBridge path", () => {
    const bridge = createBridge();
    const hydrator = createSpreadsheetObjectHydrator(bridge);
    const sheet = hydrator.hydrate({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });

    expect(sheet.getSheetValues(2, 3, 2, 2)).toStrictEqual([
      ["Vegas", new Date("2026-09-18T00:00:00.000Z")],
      [42, true],
    ]);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "get-range-values",
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
      },
    ]);
  });

  test("resolve -1 Sheet value start coordinates from data bounds", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet") {
        throw new Error(`unexpected service: ${call.service}`);
      }

      switch (call.operation) {
        case "get-sheet-data-bounds":
          return {
            lastRow: 4,
            lastColumn: 5,
          };
        case "get-range-values":
          return [["last"]];
        default:
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }
    });
    const sheet = createSpreadsheetObjectHydrator(bridge).hydrate({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });

    expect(sheet.getSheetValues(-1, -1, 1, 1)).toStrictEqual([["last"]]);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "get-sheet-data-bounds",
        sheet: {
          service: "spreadsheet",
          kind: "sheet",
          spreadsheetId: "spreadsheet-a",
          sheetId: 7,
        },
      },
      {
        service: "spreadsheet",
        operation: "get-range-values",
        range: {
          service: "spreadsheet",
          kind: "range",
          spreadsheetId: "spreadsheet-a",
          sheetId: 7,
          row: 4,
          column: 5,
          numRows: 1,
          numColumns: 1,
        },
      },
    ]);
  });

  test("reject invalid Sheet value start coordinates before HostBridge calls", () => {
    const bridge = createBridge();
    const sheet = createSpreadsheetObjectHydrator(bridge).hydrate({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });

    expect(() => sheet.getSheetValues(0, 1, 1, 1)).toThrow(
      "startRow must be -1 or a positive integer",
    );
    expect(() => sheet.getSheetValues(-2, 1, 1, 1)).toThrow(
      "startRow must be -1 or a positive integer",
    );
    expect(() => sheet.getSheetValues(1, 0, 1, 1)).toThrow(
      "startColumn must be -1 or a positive integer",
    );
    expect(() => sheet.getSheetValues(1, -2, 1, 1)).toThrow(
      "startColumn must be -1 or a positive integer",
    );
    expect(bridge.calls).toHaveLength(0);
  });

  test("reject -1 Sheet value coordinates when the Sheet has no data", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "spreadsheet" && call.operation === "get-sheet-data-bounds") {
        return {
          lastRow: null,
          lastColumn: null,
        };
      }

      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    });
    const sheet = createSpreadsheetObjectHydrator(bridge).hydrate({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });

    expect(() => sheet.getSheetValues(-1, 1, 1, 1)).toThrow("has no data row");
    expect(bridge.calls).toHaveLength(1);
  });
});
