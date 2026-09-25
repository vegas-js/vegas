import { describe, expect, test } from "vitest";

import {
  Spreadsheet,
  createSpreadsheetApp,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type SpreadsheetReference,
} from "./index";

class SpreadsheetAppContractBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "spreadsheet") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    switch (call.operation) {
      case "create-spreadsheet":
        return {
          service: "spreadsheet",
          kind: "spreadsheet",
          id: "spreadsheet-created",
        } as unknown as HostCallResult<C>;
      case "get-spreadsheet":
        return {
          service: "spreadsheet",
          kind: "spreadsheet",
          id: call.id,
        } as unknown as HostCallResult<C>;
      case "get-spreadsheet-by-url":
        return {
          service: "spreadsheet",
          kind: "spreadsheet",
          id: "spreadsheet-by-url",
        } as unknown as HostCallResult<C>;
      default:
        throw new Error("unexpected Spreadsheet operation");
    }
  }
}

const SPREADSHEET_REFERENCE = {
  service: "spreadsheet",
  kind: "spreadsheet",
  id: "spreadsheet-contract",
} as const satisfies SpreadsheetReference;

const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/spreadsheet-by-url/edit";

// Public contract:
// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app
describe("SpreadsheetApp public contract", () => {
  test("create Spreadsheets with the documented overloads", () => {
    const bridge = new SpreadsheetAppContractBridge();
    const spreadsheetApp = createSpreadsheetApp(bridge);

    expect(SPREADSHEET_REFERENCE.kind).toBe("spreadsheet");
    expect(spreadsheetApp.create("Finances")).toBeInstanceOf(Spreadsheet);
    expect(spreadsheetApp.create("Budget", 50, 5)).toBeInstanceOf(Spreadsheet);

    expect(bridge.calls).toMatchObject([
      {
        service: "spreadsheet",
        operation: "create-spreadsheet",
        name: "Finances",
      },
      {
        service: "spreadsheet",
        operation: "create-spreadsheet",
        name: "Budget",
        rows: 50,
        columns: 5,
      },
    ]);
  });

  test("expose documented data-source enablement and flush calls as local no-ops", () => {
    const bridge = new SpreadsheetAppContractBridge();
    const spreadsheetApp = createSpreadsheetApp(bridge);

    expect(spreadsheetApp.enableAllDataSourcesExecution()).toBeUndefined();
    expect(spreadsheetApp.enableBigQueryExecution()).toBeUndefined();
    expect(spreadsheetApp.enableLookerExecution()).toBeUndefined();
    expect(spreadsheetApp.flush()).toBeUndefined();

    // Apps Script changes data-source execution state and flushes pending Spreadsheet changes.
    // Vegas intentionally has neither external data-source execution nor a pending mutation queue.
    expect(bridge.calls).toHaveLength(0);
  });

  test("open Spreadsheets from Drive File identity, id, and URL", () => {
    const bridge = new SpreadsheetAppContractBridge();
    const spreadsheetApp = createSpreadsheetApp(bridge);
    const file = {
      getId: () => "spreadsheet-from-file",
    };

    expect(spreadsheetApp.open(file)).toBeInstanceOf(Spreadsheet);
    expect(spreadsheetApp.openById("spreadsheet-by-id")).toBeInstanceOf(Spreadsheet);
    expect(spreadsheetApp.openByUrl(SPREADSHEET_URL)).toBeInstanceOf(Spreadsheet);

    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "get-spreadsheet",
        id: "spreadsheet-from-file",
      },
      {
        service: "spreadsheet",
        operation: "get-spreadsheet",
        id: "spreadsheet-by-id",
      },
      {
        service: "spreadsheet",
        operation: "get-spreadsheet-by-url",
        url: SPREADSHEET_URL,
      },
    ]);
  });
});
