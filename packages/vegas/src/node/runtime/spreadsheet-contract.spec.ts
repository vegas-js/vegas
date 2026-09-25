import { describe, expect, test } from "vitest";

import {
  Sheet,
  Spreadsheet,
  createSpreadsheetObjectHydrator,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type SheetReference,
  type SpreadsheetReference,
} from "./index";

const SPREADSHEET = {
  service: "spreadsheet",
  kind: "spreadsheet",
  id: "spreadsheet-a",
} as const satisfies SpreadsheetReference;

const SUMMARY = {
  service: "spreadsheet",
  kind: "sheet",
  spreadsheetId: "spreadsheet-a",
  sheetId: 7,
} as const satisfies SheetReference;

const DATA = {
  service: "spreadsheet",
  kind: "sheet",
  spreadsheetId: "spreadsheet-a",
  sheetId: 9,
} as const satisfies SheetReference;

class SpreadsheetContractBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  #name = "Budget";

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "spreadsheet") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    switch (call.operation) {
      case "get-spreadsheet-url":
        return "https://example.invalid/spreadsheets/spreadsheet-a" as unknown as HostCallResult<C>;
      case "get-spreadsheet-metadata":
        return {
          name: this.#name,
        } as unknown as HostCallResult<C>;
      case "list-sheets":
        return [SUMMARY, DATA] as unknown as HostCallResult<C>;
      case "get-sheet":
        if (call.sheetId === 7) {
          return SUMMARY as unknown as HostCallResult<C>;
        }
        if (call.sheetId === 9) {
          return DATA as unknown as HostCallResult<C>;
        }
        return null as unknown as HostCallResult<C>;
      case "get-sheet-by-name":
        if (call.name === "Summary") {
          return SUMMARY as unknown as HostCallResult<C>;
        }
        if (call.name === "Data") {
          return DATA as unknown as HostCallResult<C>;
        }
        return null as unknown as HostCallResult<C>;
      case "rename-spreadsheet":
        this.#name = call.name;
        return undefined as unknown as HostCallResult<C>;
      default:
        throw new Error("unexpected Spreadsheet operation");
    }
  }
}

// Public contract:
// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet
describe("Spreadsheet public contract", () => {
  test("expose spreadsheet identity, URL, name, and sheet count", () => {
    const bridge = new SpreadsheetContractBridge();
    const spreadsheet = new Spreadsheet(
      bridge,
      SPREADSHEET,
      createSpreadsheetObjectHydrator(bridge),
    );

    expect(spreadsheet.getId()).toBe("spreadsheet-a");

    // Apps Script returns the Spreadsheet URL. Vegas delegates local URL mapping to HostBridge,
    // so the contract fixes the string-returning API without asserting a Google production URL.
    expect(spreadsheet.getUrl()).toBe("https://example.invalid/spreadsheets/spreadsheet-a");
    expect(spreadsheet.getName()).toBe("Budget");
    expect(spreadsheet.getNumSheets()).toBe(2);
  });

  test("return Sheets and nullable lookups by id or name", () => {
    const bridge = new SpreadsheetContractBridge();
    const spreadsheet = new Spreadsheet(
      bridge,
      SPREADSHEET,
      createSpreadsheetObjectHydrator(bridge),
    );

    const sheets = spreadsheet.getSheets();

    expect(sheets).toHaveLength(2);
    expect(sheets.every((sheet) => sheet instanceof Sheet)).toBe(true);
    expect(spreadsheet.getSheetById(7)).toBeInstanceOf(Sheet);
    expect(spreadsheet.getSheetById(999)).toBeNull();
    expect(spreadsheet.getSheetByName("Summary")).toBeInstanceOf(Sheet);
    expect(spreadsheet.getSheetByName("Missing")).toBeNull();
  });

  test("rename the Spreadsheet and return undefined", () => {
    const bridge = new SpreadsheetContractBridge();
    const spreadsheet = new Spreadsheet(
      bridge,
      SPREADSHEET,
      createSpreadsheetObjectHydrator(bridge),
    );

    expect(spreadsheet.rename("Forecast")).toBeUndefined();
    expect(spreadsheet.getName()).toBe("Forecast");
    expect(bridge.calls).toMatchObject([
      {
        service: "spreadsheet",
        operation: "rename-spreadsheet",
        spreadsheet: SPREADSHEET,
        name: "Forecast",
      },
      {
        service: "spreadsheet",
        operation: "get-spreadsheet-metadata",
        spreadsheet: SPREADSHEET,
      },
    ]);
  });
});
