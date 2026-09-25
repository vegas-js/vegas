import { describe, expect, test } from "vitest";

import type { HostBridge } from "./host-bridge";
import type { HostCall, HostCallResult } from "./host-call";
import { SPREADSHEET_DIRECTION, type SpreadsheetDirection } from "./spreadsheet-enum";
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

class NextDataCellHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #cells = new Map<string, SpreadsheetCellValue>();
  readonly #maxRows: number;
  readonly #maxColumns: number;

  constructor(
    cells: readonly (readonly [number, number, SpreadsheetCellValue])[],
    maxRows = 6,
    maxColumns = 6,
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
      case "get-range-values":
        return Array.from({ length: call.range.numRows }, (_, rowOffset) =>
          Array.from(
            { length: call.range.numColumns },
            (_, columnOffset) =>
              this.#cells.get(
                createCellKey(call.range.row + rowOffset, call.range.column + columnOffset),
              ) ?? "",
          ),
        );
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
  numRows: 2,
  numColumns: 2,
} satisfies RangeReference;

function expectTarget(
  cells: readonly (readonly [number, number, SpreadsheetCellValue])[],
  direction: SpreadsheetDirection,
  row: number,
  column: number,
): void {
  const bridge = new NextDataCellHostBridge(cells);
  const hydrator = new RecordingSpreadsheetObjectHydrator();
  const range = new Range(bridge, SOURCE, hydrator);

  expect(range.getNextDataCell(direction)).toBe(hydrator.result);
  expect(hydrator.references).toStrictEqual([
    {
      ...SOURCE,
      row,
      column,
      numRows: 1,
      numColumns: 1,
    },
  ]);
}

describe("Range.getNextDataCell", () => {
  // Public contract and canonical example:
  // https://developers.google.com/apps-script/reference/spreadsheet/range#getnextdatacelldirection
  test("start at the top-left cell and stop at the end of adjacent data", () => {
    expectTarget(
      [
        [3, 3, "start"],
        [4, 3, 0],
        [5, 3, false],
        [4, 4, "ignored lower-right cell"],
      ],
      SPREADSHEET_DIRECTION.DOWN,
      5,
      3,
    );
  });

  test("jump across blank cells to the next data cell in every direction", () => {
    expectTarget([[1, 3, "up"]], SPREADSHEET_DIRECTION.UP, 1, 3);
    expectTarget([[5, 3, "down"]], SPREADSHEET_DIRECTION.DOWN, 5, 3);
    expectTarget([[3, 1, "previous"]], SPREADSHEET_DIRECTION.PREVIOUS, 3, 1);
    expectTarget([[3, 5, "next"]], SPREADSHEET_DIRECTION.NEXT, 3, 5);
  });

  test("fall back to the Sheet edge when there is no more data", () => {
    expectTarget([], SPREADSHEET_DIRECTION.UP, 1, 3);
    expectTarget([], SPREADSHEET_DIRECTION.DOWN, 6, 3);
    expectTarget([], SPREADSHEET_DIRECTION.PREVIOUS, 3, 1);
    expectTarget([], SPREADSHEET_DIRECTION.NEXT, 3, 6);
  });

  test("reject unknown direction values before crossing collaborators", () => {
    const bridge = new NextDataCellHostBridge([]);
    const hydrator = new RecordingSpreadsheetObjectHydrator();
    const range = new Range(bridge, SOURCE, hydrator);

    expect(() => range.getNextDataCell("INVALID" as SpreadsheetDirection)).toThrow(
      "data cell direction must be UP, DOWN, PREVIOUS, or NEXT",
    );
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });
});
