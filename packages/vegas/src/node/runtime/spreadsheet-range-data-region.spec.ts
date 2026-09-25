import { describe, expect, test } from "vitest";

import type { HostBridge } from "./host-bridge";
import type { HostCall, HostCallResult } from "./host-call";
import { SPREADSHEET_DIMENSION, type SpreadsheetDimension } from "./spreadsheet-enum";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import { Range } from "./spreadsheet-range";
import type {
  RangeReference,
  SheetReference,
  SpreadsheetObjectReference,
  SpreadsheetReference,
} from "./spreadsheet-reference";
import type { Sheet } from "./spreadsheet-sheet";
import type { Spreadsheet } from "./spreadsheet-spreadsheet";
import type { SpreadsheetCellValue } from "./spreadsheet-store";

function createCellKey(row: number, column: number): string {
  return `${row}:${column}`;
}

class DataRegionHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #cells = new Map<string, SpreadsheetCellValue>();
  readonly #maxRows: number;
  readonly #maxColumns: number;

  constructor(
    cells: readonly (readonly [number, number, SpreadsheetCellValue])[],
    maxRows = 5,
    maxColumns = 5,
  ) {
    this.#maxRows = maxRows;
    this.#maxColumns = maxColumns;

    for (const [row, column, value] of cells) {
      this.#cells.set(createCellKey(row, column), value);
    }
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);
    return this.#respond(call) as HostCallResult<C>;
  }

  #respond(call: HostCall): unknown {
    if (call.service !== "spreadsheet") {
      throw new Error(`unexpected service: ${call.service}`);
    }

    switch (call.operation) {
      case "get-sheet-metadata":
        return {
          name: "Sheet1",
          maxRows: this.#maxRows,
          maxColumns: this.#maxColumns,
          frozenColumns: 0,
          frozenRows: 0,
          hidden: false,
          hiddenGridlines: false,
          rightToLeft: false,
          tabColor: null,
        };
      case "get-range-values": {
        const lastRow = call.range.row + call.range.numRows - 1;
        const lastColumn = call.range.column + call.range.numColumns - 1;

        if (
          call.range.row < 1 ||
          call.range.column < 1 ||
          lastRow > this.#maxRows ||
          lastColumn > this.#maxColumns
        ) {
          throw new RangeError("test Range is outside Sheet bounds");
        }

        return Array.from({ length: call.range.numRows }, (_, rowOffset) =>
          Array.from(
            { length: call.range.numColumns },
            (_, columnOffset) =>
              this.#cells.get(
                createCellKey(call.range.row + rowOffset, call.range.column + columnOffset),
              ) ?? "",
          ),
        );
      }
      default:
        throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    }
  }
}

class RecordingSpreadsheetObjectHydrator implements SpreadsheetObjectHydrator {
  readonly references: SpreadsheetObjectReference[] = [];
  readonly result = {} as Range;

  hydrate(reference: SpreadsheetReference): Spreadsheet;
  hydrate(reference: SheetReference): Sheet;
  hydrate(reference: RangeReference): Range;
  hydrate(reference: SpreadsheetObjectReference): Spreadsheet | Sheet | Range {
    this.references.push(reference);

    if (reference.kind !== "range") {
      throw new Error(`unexpected Spreadsheet object reference: ${reference.kind}`);
    }

    return this.result;
  }
}

const SOURCE = {
  service: "spreadsheet",
  kind: "range",
  spreadsheetId: "spreadsheet-a",
  sheetId: 7,
  row: 3,
  column: 3,
  numRows: 1,
  numColumns: 1,
} satisfies RangeReference;

describe("Range.getDataRegion", () => {
  // Public contract and canonical example:
  // https://developers.google.com/apps-script/reference/spreadsheet/range#getdataregion
  // https://developers.google.com/apps-script/reference/spreadsheet/range#getdataregiondimension
  test("expand across adjacent data in all or one dimension", () => {
    const bridge = new DataRegionHostBridge([
      [2, 3, 100],
      [3, 2, 100],
      [3, 4, 100],
      [4, 3, 100],
    ]);
    const hydrator = new RecordingSpreadsheetObjectHydrator();
    const range = new Range(bridge, SOURCE, hydrator);

    expect(range.getDataRegion()).toBe(hydrator.result);
    expect(range.getDataRegion(SPREADSHEET_DIMENSION.ROWS)).toBe(hydrator.result);
    expect(range.getDataRegion(SPREADSHEET_DIMENSION.COLUMNS)).toBe(hydrator.result);
    expect(hydrator.references).toStrictEqual([
      {
        ...SOURCE,
        row: 2,
        column: 2,
        numRows: 3,
        numColumns: 3,
      },
      {
        ...SOURCE,
        row: 2,
        numRows: 3,
      },
      {
        ...SOURCE,
        column: 2,
        numColumns: 3,
      },
    ]);
  });

  test("keep a Range unchanged when only diagonal data is adjacent", () => {
    const bridge = new DataRegionHostBridge([[2, 2, "diagonal"]]);
    const hydrator = new RecordingSpreadsheetObjectHydrator();
    const range = new Range(bridge, SOURCE, hydrator);

    expect(range.getDataRegion()).toBe(hydrator.result);
    expect(hydrator.references).toStrictEqual([SOURCE]);
  });

  test("respect Sheet bounds while expanding a data region", () => {
    const source = {
      ...SOURCE,
      row: 1,
      column: 1,
    };
    const bridge = new DataRegionHostBridge([
      [1, 1, "start"],
      [1, 2, "right"],
      [2, 1, "down"],
    ]);
    const hydrator = new RecordingSpreadsheetObjectHydrator();
    const range = new Range(bridge, source, hydrator);

    expect(range.getDataRegion()).toBe(hydrator.result);
    expect(hydrator.references).toStrictEqual([
      {
        ...source,
        numRows: 2,
        numColumns: 2,
      },
    ]);
  });

  test("reject unknown dimension values before crossing collaborators", () => {
    const bridge = new DataRegionHostBridge([]);
    const hydrator = new RecordingSpreadsheetObjectHydrator();
    const range = new Range(bridge, SOURCE, hydrator);

    expect(() => range.getDataRegion("INVALID" as SpreadsheetDimension)).toThrow(
      "data region dimension must be ROWS or COLUMNS",
    );
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });
});
