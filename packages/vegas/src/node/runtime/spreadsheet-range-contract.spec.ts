import { describe, expect, test, vi } from "vitest";

import {
  Range,
  Sheet,
  createSpreadsheetObjectHydrator,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type RangeReference,
  type SpreadsheetCellValue,
  type SpreadsheetGrid,
} from "./index";
import type { SpreadsheetNoteGrid } from "./spreadsheet-store";

const RANGE = {
  service: "spreadsheet",
  kind: "range",
  spreadsheetId: "spreadsheet-a",
  sheetId: 7,
  row: 2,
  column: 3,
  numRows: 2,
  numColumns: 2,
} as const satisfies RangeReference;

function cloneCell(value: SpreadsheetCellValue): SpreadsheetCellValue {
  return value instanceof Date ? new Date(value.getTime()) : value;
}

function cloneGrid(values: SpreadsheetGrid): SpreadsheetCellValue[][] {
  return values.map((row) => row.map(cloneCell));
}

class RangeContractBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  values: SpreadsheetCellValue[][];
  notes: (string | null)[][];

  constructor(
    values: SpreadsheetGrid = [
      ["Vegas", 42],
      [true, "Runtime"],
    ],
    notes: SpreadsheetNoteGrid = [
      ["top-left", null],
      [null, "bottom-right"],
    ],
  ) {
    this.values = cloneGrid(values);
    this.notes = notes.map((row) => [...row]);
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "spreadsheet") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    switch (call.operation) {
      case "get-range-values":
        return cloneGrid(this.values) as unknown as HostCallResult<C>;
      case "set-range-values":
        this.values = cloneGrid(call.values);
        return undefined as unknown as HostCallResult<C>;
      case "get-range-notes":
        return this.notes.map((row) => [...row]) as unknown as HostCallResult<C>;
      case "set-range-notes":
        this.notes = call.notes.map((row) => [...row]);
        return undefined as unknown as HostCallResult<C>;
      default:
        throw new Error(`unexpected Spreadsheet operation: ${call.operation}`);
    }
  }
}

function createRange(bridge: HostBridge, reference: RangeReference = RANGE): Range {
  return new Range(bridge, reference, createSpreadsheetObjectHydrator(bridge));
}

// Public contract:
// https://developers.google.com/apps-script/reference/spreadsheet/range
describe("Range public contract", () => {
  test("expose geometry, boundedness, cells, offsets, and parent Sheet", () => {
    const bridge = new RangeContractBridge();
    const range = createRange(bridge);

    expect(range.canEdit()).toBe(true);
    expect(range.getA1Notation()).toBe("C2:D3");
    expect(range.getColumn()).toBe(3);
    expect(range.getGridId()).toBe(7);
    expect(range.getHeight()).toBe(2);
    expect(range.getLastColumn()).toBe(4);
    expect(range.getLastRow()).toBe(3);
    expect(range.getNumColumns()).toBe(2);
    expect(range.getNumRows()).toBe(2);
    expect(range.getRow()).toBe(2);
    expect(range.getRowIndex()).toBe(2);
    expect(range.getWidth()).toBe(2);
    expect(range.getSheet()).toBeInstanceOf(Sheet);

    expect(range.isStartColumnBounded()).toBe(true);
    expect(range.isEndColumnBounded()).toBe(true);
    expect(range.isStartRowBounded()).toBe(true);
    expect(range.isEndRowBounded()).toBe(true);

    expect(range.getCell(2, 2).getA1Notation()).toBe("D3");
    expect(range.offset(1, -1).getA1Notation()).toBe("B3:C4");
    expect(range.offset(-1, 1, 1).getA1Notation()).toBe("D1:E1");
    expect(range.offset(1, 1, 3, 4).getA1Notation()).toBe("D3:G5");
  });

  test("read, write, clear, and inspect values and notes", () => {
    const bridge = new RangeContractBridge();
    const range = createRange(bridge);

    expect(range.getValue()).toBe("Vegas");
    expect(range.getValues()).toStrictEqual([
      ["Vegas", 42],
      [true, "Runtime"],
    ]);
    expect(range.isBlank()).toBe(false);

    expect(range.getNote()).toBe("top-left");
    expect(range.getNotes()).toStrictEqual([
      ["top-left", ""],
      ["", "bottom-right"],
    ]);

    expect(range.setNote("shared")).toBe(range);
    expect(bridge.notes).toStrictEqual([
      ["shared", "shared"],
      ["shared", "shared"],
    ]);

    expect(
      range.setNotes([
        ["first", null],
        [null, "last"],
      ]),
    ).toBe(range);
    expect(range.clearNote()).toBe(range);
    expect(range.getNotes()).toStrictEqual([
      ["", ""],
      ["", ""],
    ]);

    expect(range.setValue("Updated")).toBe(range);
    expect(bridge.values).toStrictEqual([
      ["Updated", "Updated"],
      ["Updated", "Updated"],
    ]);

    expect(
      range.setValues([
        [1, 2],
        [3, 4],
      ]),
    ).toBe(range);
    expect(range.clearContent()).toBe(range);
    expect(range.getValues()).toStrictEqual([
      ["", ""],
      ["", ""],
    ]);
    expect(range.isBlank()).toBe(true);
  });

  test("fail closed for formulas while preserving trimWhitespace text semantics", () => {
    const bridge = new RangeContractBridge([
      ["  leading ", "two  spaces"],
      ["\n =SUM(1,2)\t", 42],
    ]);
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

    expect(range.trimWhitespace()).toBe(range);
    expect(bridge.values).toStrictEqual([
      ["leading", "two spaces"],
      ["=SUM(1,2)", 42],
    ]);
  });

  test("randomize and remove duplicate rows with documented chaining contracts", () => {
    const randomBridge = new RangeContractBridge([
      ["A", 1],
      ["B", 2],
      ["C", 3],
    ]);
    const randomRange = createRange(randomBridge, {
      ...RANGE,
      row: 1,
      column: 1,
      numRows: 3,
    });
    const random = vi.spyOn(Math, "random").mockReturnValue(0);

    try {
      expect(randomRange.randomize()).toBe(randomRange);
    } finally {
      random.mockRestore();
    }

    expect(randomBridge.values).toStrictEqual([
      ["B", 2],
      ["C", 3],
      ["A", 1],
    ]);

    const duplicateBridge = new RangeContractBridge([
      ["Alpha", 1],
      ["alpha", 1],
      ["Beta", 2],
    ]);
    const duplicateRange = createRange(duplicateBridge, {
      ...RANGE,
      row: 1,
      column: 2,
      numRows: 3,
    });

    expect(duplicateRange.removeDuplicates().getA1Notation()).toBe("B1:C2");
    expect(duplicateBridge.values).toStrictEqual([
      ["Alpha", 1],
      ["Beta", 2],
      ["", ""],
    ]);
  });
});
