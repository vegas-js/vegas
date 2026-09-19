import { describe, expect, test } from "vitest";

import {
  createSpreadsheetApp,
  createSpreadsheetObjectHydrator,
  Sheet,
  Spreadsheet,
  SpreadsheetApp,
  type HostBridge,
  type HostCall,
  type HostCallResult,
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
      case "get-spreadsheet":
        return {
          service: "spreadsheet",
          kind: "spreadsheet",
          id: call.id,
        } satisfies SpreadsheetReference;
      case "get-spreadsheet-metadata":
        return {
          name: "Budget",
        };
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
      case "get-sheet":
        if (call.sheetId !== 7 && call.sheetId !== 9) {
          return null;
        }

        return {
          service: "spreadsheet",
          kind: "sheet",
          spreadsheetId: call.spreadsheet.id,
          sheetId: call.sheetId,
        } satisfies SheetReference;
      case "get-sheet-by-name":
        if (call.name === "Missing") {
          return null;
        }

        return {
          service: "spreadsheet",
          kind: "sheet",
          spreadsheetId: call.spreadsheet.id,
          sheetId: 7,
        } satisfies SheetReference;
      case "get-sheet-metadata":
        return {
          name: "Summary",
          maxRows: 100,
          maxColumns: 26,
          hiddenGridlines: false,
          rightToLeft: false,
        };
      default:
        throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    }
  });
}

describe("Spreadsheet", () => {
  test("open Spreadsheet resources and hydrate Sheet chains", () => {
    const bridge = createBridge();
    const spreadsheetApp = createSpreadsheetApp(bridge);

    expect(spreadsheetApp).toBeInstanceOf(SpreadsheetApp);

    const spreadsheet = spreadsheetApp.openById("spreadsheet-a");
    expect(spreadsheet).toBeInstanceOf(Spreadsheet);
    expect(spreadsheet.getId()).toBe("spreadsheet-a");
    expect(spreadsheet.getName()).toBe("Budget");
    expect(spreadsheet.getNumSheets()).toBe(2);

    const sheets = spreadsheet.getSheets();
    expect(sheets).toHaveLength(2);
    expect(sheets[0]).toBeInstanceOf(Sheet);
    expect(sheets[0]?.getSheetId()).toBe(7);

    expect(spreadsheet.getSheetById(7)).toBeInstanceOf(Sheet);
    expect(spreadsheet.getSheetById(7)?.getSheetId()).toBe(7);
    expect(spreadsheet.getSheetById(999)).toBeNull();

    const summary = spreadsheet.getSheetByName("Summary");
    expect(summary).toBeInstanceOf(Sheet);
    expect(summary?.getName()).toBe("Summary");
    expect(summary?.getSheetName()).toBe("Summary");
    expect(summary?.getMaxRows()).toBe(100);
    expect(summary?.getMaxColumns()).toBe(26);

    expect(spreadsheet.getSheetByName("Missing")).toBeNull();
  });

  test("rename a Spreadsheet through the HostBridge", () => {
    let name = "Budget";
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet") {
        throw new Error(`unexpected service: ${call.service}`);
      }

      switch (call.operation) {
        case "get-spreadsheet-metadata":
          return { name };
        case "rename-spreadsheet":
          name = call.name;
          return undefined;
        default:
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }
    });
    const spreadsheet = createSpreadsheetObjectHydrator(bridge).hydrate({
      service: "spreadsheet",
      kind: "spreadsheet",
      id: "spreadsheet-a",
    });

    expect(spreadsheet.getName()).toBe("Budget");
    expect(spreadsheet.rename("Forecast")).toBeUndefined();
    expect(spreadsheet.getName()).toBe("Forecast");
    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-spreadsheet-metadata",
      "rename-spreadsheet",
      "get-spreadsheet-metadata",
    ]);
  });

  test("reject non-integer Sheet ids before HostBridge calls", () => {
    const bridge = createBridge();
    const spreadsheet = createSpreadsheetObjectHydrator(bridge).hydrate({
      service: "spreadsheet",
      kind: "spreadsheet",
      id: "spreadsheet-a",
    });

    expect(() => spreadsheet.getSheetById(7.5)).toThrow("Spreadsheet sheet id must be an integer.");
    expect(bridge.calls).toHaveLength(0);
  });
});
