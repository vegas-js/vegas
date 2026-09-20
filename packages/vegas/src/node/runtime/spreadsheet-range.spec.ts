import { describe, expect, test } from "vitest";

import type { HostBridge } from "./host-bridge";
import type { HostCall, HostCallResult } from "./host-call";
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

class RecordingSpreadsheetObjectHydrator implements SpreadsheetObjectHydrator {
  readonly references: SpreadsheetObjectReference[] = [];
  readonly #range: Range;
  readonly #sheet: Sheet;

  constructor(range: Range, sheet: Sheet) {
    this.#range = range;
    this.#sheet = sheet;
  }

  hydrate(reference: SpreadsheetReference): Spreadsheet;
  hydrate(reference: SheetReference): Sheet;
  hydrate(reference: RangeReference): Range;
  hydrate(reference: SpreadsheetObjectReference): Spreadsheet | Sheet | Range {
    this.references.push(reference);

    switch (reference.kind) {
      case "range":
        return this.#range;
      case "sheet":
        return this.#sheet;
      case "spreadsheet":
        throw new Error("unexpected Spreadsheet hydration");
    }
  }
}

const defaultRangeReference = {
  service: "spreadsheet",
  kind: "range",
  spreadsheetId: "spreadsheet-a",
  sheetId: 7,
  row: 2,
  column: 3,
  numRows: 2,
  numColumns: 2,
} satisfies RangeReference;

function createBridge(values: SpreadsheetGrid = []) {
  return new RecordingHostBridge((call) => {
    if (call.service !== "spreadsheet") {
      throw new Error(`unexpected service: ${call.service}`);
    }

    switch (call.operation) {
      case "get-range-values":
        return values;
      case "set-range-values":
        return undefined;
      default:
        throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    }
  });
}

function createFixture({
  bridge = createBridge(),
  reference = defaultRangeReference,
}: {
  bridge?: RecordingHostBridge;
  reference?: RangeReference;
} = {}) {
  const childRange = {} as Range;
  const sheet = {} as Sheet;
  const hydrator = new RecordingSpreadsheetObjectHydrator(childRange, sheet);

  return {
    bridge,
    childRange,
    hydrator,
    range: new Range(bridge, reference, hydrator),
    sheet,
  };
}

describe("Range", () => {
  test("read Range geometry, parent Sheet, and values through collaborators", () => {
    const sourceDate = new Date("2026-09-18T00:00:00.000Z");
    const bridge = createBridge([
      ["Vegas", sourceDate],
      [42, true],
    ]);
    const { hydrator, range, sheet } = createFixture({ bridge });

    expect(range.getRow()).toBe(2);
    expect(range.getColumn()).toBe(3);
    expect(range.getNumRows()).toBe(2);
    expect(range.getNumColumns()).toBe(2);
    expect(range.getSheet()).toBe(sheet);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
      },
    ]);

    expect(range.getValues()).toStrictEqual([
      ["Vegas", new Date("2026-09-18T00:00:00.000Z")],
      [42, true],
    ]);
    expect(range.getValue()).toBe("Vegas");

    const values = range.getValues();
    const date = values[0]?.[1];
    expect(date).toBeInstanceOf(Date);
    expect(date).not.toBe(sourceDate);

    if (!(date instanceof Date)) {
      throw new Error("expected Date value");
    }

    date.setUTCFullYear(2030);

    expect(sourceDate).toStrictEqual(new Date("2026-09-18T00:00:00.000Z"));
    expect(bridge.calls.every((call) => call.operation === "get-range-values")).toBe(true);
  });

  test("report whether a Range is totally blank", () => {
    let blank = true;
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet" || call.operation !== "get-range-values") {
        throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }

      return blank
        ? [
            ["", ""],
            ["", ""],
          ]
        : [
            ["", 0],
            ["", ""],
          ];
    });
    const { hydrator, range } = createFixture({ bridge });

    expect(range.isBlank()).toBe(true);

    blank = false;

    expect(range.isBlank()).toBe(false);
    expect(bridge.calls).toHaveLength(2);
    expect(hydrator.references).toHaveLength(0);
  });

  test("report explicit rectangular Ranges as fully bounded without collaborators", () => {
    const { bridge, hydrator, range } = createFixture();

    expect(range.isStartRowBounded()).toBe(true);
    expect(range.isEndRowBounded()).toBe(true);
    expect(range.isStartColumnBounded()).toBe(true);
    expect(range.isEndColumnBounded()).toBe(true);
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });

  test("format Range coordinates as A1 notation without crossing collaborators", () => {
    const bridge = createBridge();
    const childRange = {} as Range;
    const sheet = {} as Sheet;
    const hydrator = new RecordingSpreadsheetObjectHydrator(childRange, sheet);
    const cases = [
      [1, 1, 1, 1, "A1"],
      [5, 26, 1, 1, "Z5"],
      [5, 27, 1, 1, "AA5"],
      [5, 52, 1, 1, "AZ5"],
      [5, 53, 3, 2, "BA5:BB7"],
      [1, 1, 2, 5, "A1:E2"],
    ] as const;

    for (const [row, column, numRows, numColumns, expected] of cases) {
      const range = new Range(
        bridge,
        {
          service: "spreadsheet",
          kind: "range",
          spreadsheetId: "spreadsheet-a",
          sheetId: 7,
          row,
          column,
          numRows,
          numColumns,
        },
        hydrator,
      );

      expect(range.getA1Notation()).toBe(expected);
      expect(range.getGridId()).toBe(7);
      expect(range.getHeight()).toBe(numRows);
      expect(range.getLastColumn()).toBe(column + numColumns - 1);
      expect(range.getLastRow()).toBe(row + numRows - 1);
      expect(range.getRowIndex()).toBe(row);
      expect(range.getWidth()).toBe(numColumns);
    }

    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });

  test("resolve cells relative to a Range through the hydrator", () => {
    const { bridge, childRange, hydrator, range } = createFixture({
      reference: {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 2,
        column: 2,
        numRows: 3,
        numColumns: 3,
      },
    });

    expect(range.getCell(1, 1)).toBe(childRange);
    expect(range.getCell(2, 2)).toBe(childRange);
    expect(range.getCell(3, 3)).toBe(childRange);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 2,
        column: 2,
        numRows: 1,
        numColumns: 1,
      },
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 3,
        column: 3,
        numRows: 1,
        numColumns: 1,
      },
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 4,
        column: 4,
        numRows: 1,
        numColumns: 1,
      },
    ]);
    expect(bridge.calls).toHaveLength(0);
  });

  test("reject cell coordinates outside the Range before crossing collaborators", () => {
    const { bridge, hydrator, range } = createFixture({
      reference: {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 2,
        column: 2,
        numRows: 3,
        numColumns: 3,
      },
    });

    expect(() => range.getCell(0, 1)).toThrow("cell row must be a positive integer");
    expect(() => range.getCell(1, 0)).toThrow("cell column must be a positive integer");
    expect(() => range.getCell(1.5, 1)).toThrow("cell row must be a positive integer");
    expect(() => range.getCell(4, 1)).toThrow("outside the range");
    expect(() => range.getCell(1, 4)).toThrow("outside the range");
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });

  test("offset Ranges locally with Apps Script overload semantics", () => {
    const { bridge, childRange, hydrator, range } = createFixture({
      reference: {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 5,
        column: 5,
        numRows: 2,
        numColumns: 3,
      },
    });

    expect(range.offset(-2, 1)).toBe(childRange);
    expect(range.offset(1, -2, 4)).toBe(childRange);
    expect(range.offset(-4, -4, 3, 2)).toBe(childRange);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 3,
        column: 6,
        numRows: 2,
        numColumns: 3,
      },
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 6,
        column: 3,
        numRows: 4,
        numColumns: 3,
      },
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 1,
        column: 1,
        numRows: 3,
        numColumns: 2,
      },
    ]);
    expect(bridge.calls).toHaveLength(0);
  });

  test("reject invalid Range offsets before crossing collaborators", () => {
    const { bridge, hydrator, range } = createFixture({
      reference: {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 5,
        column: 5,
        numRows: 2,
        numColumns: 3,
      },
    });

    expect(() => range.offset(0.5, 0)).toThrow("rowOffset must be an integer");
    expect(() => range.offset(0, 0.5)).toThrow("columnOffset must be an integer");
    expect(() => range.offset(-5, 0)).toThrow("row must be a positive integer");
    expect(() => range.offset(0, -5)).toThrow("column must be a positive integer");
    expect(() => range.offset(0, 0, 0)).toThrow("numRows must be a positive integer");
    expect(() => range.offset(0, 0, 1, 0)).toThrow("numColumns must be a positive integer");
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });

  test("clear Range content through the HostBridge and preserve chaining", () => {
    const bridge = createBridge();
    const { hydrator, range } = createFixture({ bridge });

    expect(range.clearContent()).toBe(range);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "set-range-values",
        range: defaultRangeReference,
        values: [
          ["", ""],
          ["", ""],
        ],
      },
    ]);
    expect(hydrator.references).toHaveLength(0);
  });

  test("write a single Range value through the HostBridge and preserve chaining", () => {
    const bridge = createBridge();
    const { hydrator, range } = createFixture({
      bridge,
      reference: {
        ...defaultRangeReference,
        numRows: 1,
        numColumns: 1,
      },
    });

    expect(range.setValue("Updated")).toBe(range);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "set-range-values",
        range: {
          ...defaultRangeReference,
          numRows: 1,
          numColumns: 1,
        },
        values: [["Updated"]],
      },
    ]);
    expect(hydrator.references).toHaveLength(0);
  });

  test("write Range grids through the HostBridge and preserve chaining", () => {
    const bridge = createBridge();
    const { hydrator, range } = createFixture({
      bridge,
      reference: {
        ...defaultRangeReference,
        row: 1,
        column: 1,
      },
    });
    const values = [
      ["Updated", 100],
      ["Second", 200],
    ] as const;

    expect(range.setValues(values)).toBe(range);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "set-range-values",
        range: {
          ...defaultRangeReference,
          row: 1,
          column: 1,
        },
        values,
      },
    ]);
    expect(hydrator.references).toHaveLength(0);
  });
});
