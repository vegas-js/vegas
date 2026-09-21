import { describe, expect, test, vi } from "vitest";

import type { HostBridge } from "./host-bridge";
import type { HostCall, HostCallResult } from "./host-call";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import type { Range } from "./spreadsheet-range";
import type {
  RangeReference,
  SheetReference,
  SpreadsheetObjectReference,
  SpreadsheetReference,
} from "./spreadsheet-reference";
import { Sheet } from "./spreadsheet-sheet";
import type { Spreadsheet } from "./spreadsheet-spreadsheet";
import type { SpreadsheetGrid } from "./spreadsheet-store";

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

class RangeHydrator implements SpreadsheetObjectHydrator {
  readonly references: SpreadsheetObjectReference[] = [];
  readonly #range: Range;

  constructor(range: Range) {
    this.#range = range;
  }

  hydrate(reference: SpreadsheetReference): Spreadsheet;
  hydrate(reference: SheetReference): Sheet;
  hydrate(reference: RangeReference): Range;
  hydrate(reference: SpreadsheetObjectReference): Spreadsheet | Sheet | Range {
    this.references.push(reference);

    if (reference.kind !== "range") {
      throw new Error(`unexpected Spreadsheet object reference: ${reference.kind}`);
    }

    return this.#range;
  }
}

const sheetReference = {
  service: "spreadsheet",
  kind: "sheet",
  spreadsheetId: "spreadsheet-a",
  sheetId: 7,
} satisfies SheetReference;

function createFixture(lastRow: number | null) {
  const bridge = new RecordingHostBridge((call) => {
    if (call.service === "spreadsheet" && call.operation === "get-sheet-data-bounds") {
      return {
        lastRow,
        lastColumn: lastRow === null ? null : 3,
      };
    }

    throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
  });
  const setValues = vi.fn<(values: SpreadsheetGrid) => Range>();
  const range = {
    setValues(values: SpreadsheetGrid) {
      setValues(values);
      return range;
    },
  } as unknown as Range;
  const hydrator = new RangeHydrator(range);

  return {
    bridge,
    hydrator,
    setValues,
    sheet: new Sheet(bridge, sheetReference, hydrator),
  };
}

describe("Sheet.appendRow", () => {
  test("append values after the last content row", () => {
    const { bridge, hydrator, setValues, sheet } = createFixture(3);
    const date = new Date("2026-09-21T00:00:00.000Z");
    const values = ["Vegas", 42, true, date];

    expect(sheet.appendRow(values)).toBe(sheet);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "get-sheet-data-bounds",
        sheet: sheetReference,
      },
    ]);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 4,
        column: 1,
        numRows: 1,
        numColumns: 4,
      },
    ]);
    expect(setValues).toHaveBeenCalledOnce();
    expect(setValues).toHaveBeenCalledWith([values]);
  });

  test("append the first row to an empty Sheet", () => {
    const { hydrator, setValues, sheet } = createFixture(null);

    expect(sheet.appendRow(["first"])).toBe(sheet);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 1,
        column: 1,
        numRows: 1,
        numColumns: 1,
      },
    ]);
    expect(setValues).toHaveBeenCalledWith([["first"]]);
  });

  test("reject an empty appended row before collaborator calls", () => {
    const { bridge, hydrator, setValues, sheet } = createFixture(3);

    expect(() => sheet.appendRow([])).toThrow(
      "Spreadsheet appended row must contain at least one value.",
    );
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
    expect(setValues).not.toHaveBeenCalled();
  });

  test("reject formula input until local formula evaluation is modeled", () => {
    const { bridge, hydrator, setValues, sheet } = createFixture(3);

    expect(() => sheet.appendRow(["=SUM(A1:A3)"])).toThrow(
      "Spreadsheet formulas are not supported by local appendRow().",
    );
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
    expect(setValues).not.toHaveBeenCalled();
  });
});
