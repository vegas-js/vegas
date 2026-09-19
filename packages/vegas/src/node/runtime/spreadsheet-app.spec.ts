import { describe, expect, test } from "vitest";

import {
  createSpreadsheetApp,
  Spreadsheet,
  type HostBridge,
  type HostCall,
  type HostCallResult,
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
    if (call.service === "spreadsheet" && call.operation === "get-spreadsheet") {
      return {
        service: "spreadsheet",
        kind: "spreadsheet",
        id: call.id,
      } satisfies SpreadsheetReference;
    }

    throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
  });
}

describe("SpreadsheetApp", () => {
  test("enable Spreadsheet data source execution without HostBridge calls", () => {
    const bridge = createBridge();
    const spreadsheetApp = createSpreadsheetApp(bridge);

    expect(spreadsheetApp.enableAllDataSourcesExecution()).toBeUndefined();
    expect(spreadsheetApp.enableBigQueryExecution()).toBeUndefined();
    expect(spreadsheetApp.enableLookerExecution()).toBeUndefined();
    expect(bridge.calls).toHaveLength(0);
  });

  test("flush SpreadsheetApp without HostBridge calls", () => {
    const bridge = createBridge();
    const spreadsheetApp = createSpreadsheetApp(bridge);

    expect(spreadsheetApp.flush()).toBeUndefined();
    expect(bridge.calls).toHaveLength(0);
  });

  test("open a Spreadsheet from a Drive File identity through the existing id path", () => {
    const bridge = createBridge();
    const spreadsheetApp = createSpreadsheetApp(bridge);
    const file = {
      getId: () => "spreadsheet-a",
    };

    const spreadsheet = spreadsheetApp.open(file);

    expect(spreadsheet).toBeInstanceOf(Spreadsheet);
    expect(spreadsheet.getId()).toBe("spreadsheet-a");
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "get-spreadsheet",
        id: "spreadsheet-a",
      },
    ]);
  });

  test("open Spreadsheet resources by URL through the existing id path", () => {
    const bridge = createBridge();
    const spreadsheetApp = createSpreadsheetApp(bridge);

    const spreadsheet = spreadsheetApp.openByUrl(
      "https://docs.google.com/spreadsheets/d/spreadsheet-a/edit#gid=7",
    );

    expect(spreadsheet).toBeInstanceOf(Spreadsheet);
    expect(spreadsheet.getId()).toBe("spreadsheet-a");
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "get-spreadsheet",
        id: "spreadsheet-a",
      },
    ]);
  });

  test("reject non-Spreadsheets URLs before HostBridge calls", () => {
    const bridge = createBridge();
    const spreadsheetApp = createSpreadsheetApp(bridge);

    expect(() => spreadsheetApp.openByUrl("https://example.com/spreadsheet-a")).toThrow(
      "Invalid Spreadsheet URL.",
    );
    expect(bridge.calls).toHaveLength(0);
  });
});
