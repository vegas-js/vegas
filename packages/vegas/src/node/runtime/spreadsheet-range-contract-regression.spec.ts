import { describe, expect, test } from "vitest";

import {
  Range,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type RangeReference,
  type SpreadsheetObjectHydrator,
} from "./index";
import { resolveSpreadsheetRangeBounds } from "./spreadsheet-range-notation";

class RecordingBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service === "spreadsheet" && call.operation === "set-range-values") {
      return undefined as unknown as HostCallResult<C>;
    }

    throw new Error("unexpected HostBridge call");
  }
}

const hydrator = {
  hydrate: () => {
    throw new Error("unexpected hydration");
  },
} as unknown as SpreadsheetObjectHydrator;

function createRange(bridge: HostBridge, overrides: Partial<RangeReference> = {}): Range {
  return new Range(
    bridge,
    {
      service: "spreadsheet",
      kind: "range",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
      row: 2,
      column: 3,
      numRows: 2,
      numColumns: 2,
      ...overrides,
    },
    hydrator,
  );
}

describe("Range contract regressions", () => {
  test("preserve full-column and full-row boundedness", () => {
    expect(resolveSpreadsheetRangeBounds("B:D")).toStrictEqual({
      startRowBounded: false,
      endRowBounded: false,
    });
    expect(resolveSpreadsheetRangeBounds("2:4")).toStrictEqual({
      startColumnBounded: false,
      endColumnBounded: false,
    });
    expect(resolveSpreadsheetRangeBounds("B2:D4")).toStrictEqual({});

    const bridge = new RecordingBridge();
    const columns = createRange(bridge, {
      row: 1,
      column: 2,
      numRows: 100,
      numColumns: 3,
      startRowBounded: false,
      endRowBounded: false,
    });
    const rows = createRange(bridge, {
      row: 2,
      column: 1,
      numRows: 3,
      numColumns: 26,
      startColumnBounded: false,
      endColumnBounded: false,
    });

    expect(columns.getA1Notation()).toBe("B:D");
    expect(columns.isStartRowBounded()).toBe(false);
    expect(columns.isEndRowBounded()).toBe(false);
    expect(columns.isStartColumnBounded()).toBe(true);
    expect(columns.isEndColumnBounded()).toBe(true);

    expect(rows.getA1Notation()).toBe("2:4");
    expect(rows.isStartRowBounded()).toBe(true);
    expect(rows.isEndRowBounded()).toBe(true);
    expect(rows.isStartColumnBounded()).toBe(false);
    expect(rows.isEndColumnBounded()).toBe(false);
  });

  test("set one value across every cell in the Range", () => {
    const bridge = new RecordingBridge();
    const range = createRange(bridge);

    expect(range.setValue("Vegas")).toBe(range);
    expect(bridge.calls).toStrictEqual([
      {
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
          ["Vegas", "Vegas"],
          ["Vegas", "Vegas"],
        ],
      },
    ]);
  });

  test("fail closed instead of silently storing formula input as text", () => {
    const bridge = new RecordingBridge();
    const range = createRange(bridge);

    expect(() => range.setValue("=SUM(A1:A2)")).toThrow(
      "Local Runtime does not support Range.setValue() with formula values",
    );
    expect(() =>
      range.setValues([
        ["plain", "=A1"],
        [1, 2],
      ]),
    ).toThrow("Local Runtime does not support Range.setValues() with formula values");

    expect(bridge.calls).toHaveLength(0);
  });
});
