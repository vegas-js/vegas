import { describe, expect, test } from "vitest";

import type { HostBridge } from "./host-bridge";
import type { HostCall, HostCallResult } from "./host-call";
import { SpreadsheetApp } from "./spreadsheet-app";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import type { Range } from "./spreadsheet-range";
import type {
  RangeReference,
  SheetReference,
  SpreadsheetObjectReference,
  SpreadsheetReference,
} from "./spreadsheet-reference";
import type { Sheet } from "./spreadsheet-sheet";
import type { Spreadsheet } from "./spreadsheet-spreadsheet";

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

class RecordingSpreadsheetObjectHydrator implements SpreadsheetObjectHydrator {
  readonly references: SpreadsheetObjectReference[] = [];
  readonly #spreadsheet: Spreadsheet;

  constructor(spreadsheet: Spreadsheet) {
    this.#spreadsheet = spreadsheet;
  }

  hydrate(reference: SpreadsheetReference): Spreadsheet;
  hydrate(reference: SheetReference): Sheet;
  hydrate(reference: RangeReference): Range;
  hydrate(reference: SpreadsheetObjectReference): Spreadsheet | Sheet | Range {
    this.references.push(reference);

    if (reference.kind !== "spreadsheet") {
      throw new Error(`unexpected Spreadsheet object reference: ${reference.kind}`);
    }

    return this.#spreadsheet;
  }
}

function createFixture() {
  const spreadsheet = {} as Spreadsheet;
  const bridge = new RecordingHostBridge((call) => {
    if (call.service === "spreadsheet" && call.operation === "get-spreadsheet") {
      return {
        service: "spreadsheet",
        kind: "spreadsheet",
        id: call.id,
      } satisfies SpreadsheetReference;
    }

    if (call.service === "spreadsheet" && call.operation === "get-spreadsheet-by-url") {
      return {
        service: "spreadsheet",
        kind: "spreadsheet",
        id: "spreadsheet-a",
      } satisfies SpreadsheetReference;
    }

    throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
  });
  const hydrator = new RecordingSpreadsheetObjectHydrator(spreadsheet);

  return {
    bridge,
    hydrator,
    spreadsheet,
    spreadsheetApp: new SpreadsheetApp(bridge, hydrator),
  };
}

describe("SpreadsheetApp", () => {
  test("expose the documented SheetType runtime enum", () => {
    const { bridge, hydrator, spreadsheetApp } = createFixture();

    expect(spreadsheetApp.SheetType).toStrictEqual({
      GRID: "GRID",
      OBJECT: "OBJECT",
      DATASOURCE: "DATASOURCE",
    });
    expect(JSON.stringify(spreadsheetApp.SheetType.GRID)).toBe('"GRID"');
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });

  test("enable Spreadsheet data source execution without HostBridge calls", () => {
    const { bridge, hydrator, spreadsheetApp } = createFixture();

    expect(spreadsheetApp.enableAllDataSourcesExecution()).toBeUndefined();
    expect(spreadsheetApp.enableBigQueryExecution()).toBeUndefined();
    expect(spreadsheetApp.enableLookerExecution()).toBeUndefined();
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });

  test("flush SpreadsheetApp without HostBridge calls", () => {
    const { bridge, hydrator, spreadsheetApp } = createFixture();

    expect(spreadsheetApp.flush()).toBeUndefined();
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });

  test("open a Spreadsheet from a Drive File identity through the existing id path", () => {
    const { bridge, hydrator, spreadsheet, spreadsheetApp } = createFixture();
    const file = {
      getId: () => "spreadsheet-a",
    };

    const result = spreadsheetApp.open(file);

    expect(result).toBe(spreadsheet);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "get-spreadsheet",
        id: "spreadsheet-a",
      },
    ]);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "spreadsheet",
        id: "spreadsheet-a",
      },
    ]);
  });

  test("open Spreadsheet resources by URL through HostBridge resolution", () => {
    const { bridge, hydrator, spreadsheet, spreadsheetApp } = createFixture();
    const url = "http://localhost:5173/spreadsheets/spreadsheet-a";

    const result = spreadsheetApp.openByUrl(url);

    expect(result).toBe(spreadsheet);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "get-spreadsheet-by-url",
        url,
      },
    ]);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "spreadsheet",
        id: "spreadsheet-a",
      },
    ]);
  });

  test("forward non-Google Spreadsheet URLs to HostBridge resolution", () => {
    const { bridge, hydrator, spreadsheet, spreadsheetApp } = createFixture();
    const url = "https://example.com/spreadsheet-a";

    const result = spreadsheetApp.openByUrl(url);

    expect(result).toBe(spreadsheet);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "get-spreadsheet-by-url",
        url,
      },
    ]);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "spreadsheet",
        id: "spreadsheet-a",
      },
    ]);
  });
});
