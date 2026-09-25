import { describe, expect, test } from "vitest";

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

class RecordingSpreadsheetObjectHydrator implements SpreadsheetObjectHydrator {
  readonly references: SpreadsheetObjectReference[] = [];
  readonly #spreadsheet: Spreadsheet;
  readonly #range: Range;

  constructor(spreadsheet: Spreadsheet, range: Range) {
    this.#spreadsheet = spreadsheet;
    this.#range = range;
  }

  hydrate(reference: SpreadsheetReference): Spreadsheet;
  hydrate(reference: SheetReference): Sheet;
  hydrate(reference: RangeReference): Range;
  hydrate(reference: SpreadsheetObjectReference): Spreadsheet | Sheet | Range {
    this.references.push(reference);

    switch (reference.kind) {
      case "spreadsheet":
        return this.#spreadsheet;
      case "range":
        return this.#range;
      case "sheet":
        throw new Error("unexpected Sheet hydration");
    }
  }
}

const defaultSheetReference = {
  service: "spreadsheet",
  kind: "sheet",
  spreadsheetId: "spreadsheet-a",
  sheetId: 7,
} satisfies SheetReference;

function createBridge() {
  return new RecordingHostBridge((call) => {
    if (call.service !== "spreadsheet") {
      throw new Error(`unexpected service: ${call.service}`);
    }

    switch (call.operation) {
      case "list-sheets":
        return [
          {
            service: "spreadsheet",
            kind: "sheet",
            spreadsheetId: call.spreadsheet.id,
            sheetId: 7,
          },
          {
            service: "spreadsheet",
            kind: "sheet",
            spreadsheetId: call.spreadsheet.id,
            sheetId: 9,
          },
        ] satisfies SheetReference[];
      default:
        throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    }
  });
}

function createRangeDouble(values: SpreadsheetGrid = []) {
  const clearContentCalls: true[] = [];
  const getValuesCalls: true[] = [];

  const range = {
    clearContent() {
      clearContentCalls.push(true);
      return range;
    },
    getValues() {
      getValuesCalls.push(true);
      return values;
    },
  } as unknown as Range;

  return {
    clearContentCalls,
    getValuesCalls,
    range,
  };
}

function createVisibilityRangeDouble({
  spreadsheetId = "spreadsheet-a",
  sheetId = 7,
  row = 2,
  column = 3,
  numRows = 4,
  numColumns = 2,
}: {
  spreadsheetId?: string;
  sheetId?: number;
  row?: number;
  column?: number;
  numRows?: number;
  numColumns?: number;
} = {}): Range {
  const spreadsheet = {
    getId: () => spreadsheetId,
  } as unknown as Spreadsheet;
  const sheet = {
    getParent: () => spreadsheet,
    getSheetId: () => sheetId,
  } as unknown as Sheet;

  return {
    getColumn: () => column,
    getNumColumns: () => numColumns,
    getNumRows: () => numRows,
    getRow: () => row,
    getSheet: () => sheet,
  } as unknown as Range;
}

function createFixture({
  bridge = createBridge(),
  rangeValues = [],
  reference = defaultSheetReference,
}: {
  bridge?: RecordingHostBridge;
  rangeValues?: SpreadsheetGrid;
  reference?: SheetReference;
} = {}) {
  const spreadsheet = {} as Spreadsheet;
  const rangeDouble = createRangeDouble(rangeValues);
  const hydrator = new RecordingSpreadsheetObjectHydrator(spreadsheet, rangeDouble.range);

  return {
    bridge,
    hydrator,
    rangeDouble,
    sheet: new Sheet(bridge, reference, hydrator),
    spreadsheet,
  };
}

describe("Sheet", () => {
  test("report local Sheets as GRID and not data source sheets without collaborator calls", () => {
    const { bridge, hydrator, sheet } = createFixture();

    expect(sheet.getType()).toBe("GRID");
    expect(sheet.asDataSourceSheet()).toBeNull();
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });

  test("hydrate a Sheet parent Spreadsheet without HostBridge calls", () => {
    const { bridge, hydrator, sheet, spreadsheet } = createFixture();

    expect(sheet.getParent()).toBe(spreadsheet);
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "spreadsheet",
        id: "spreadsheet-a",
      },
    ]);
  });

  test("resolve the 1-based Sheet index from parent sheet order", () => {
    const { bridge, hydrator, sheet } = createFixture({
      reference: {
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-a",
        sheetId: 9,
      },
    });

    expect(sheet.getIndex()).toBe(2);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "list-sheets",
        spreadsheet: {
          service: "spreadsheet",
          kind: "spreadsheet",
          id: "spreadsheet-a",
        },
      },
    ]);
    expect(hydrator.references).toHaveLength(0);
  });

  test("reject a Sheet reference that is absent from its parent", () => {
    const { hydrator, sheet } = createFixture({
      reference: {
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-a",
        sheetId: 999,
      },
    });

    expect(() => sheet.getIndex()).toThrow("Spreadsheet sheet is not present in its parent.");
    expect(hydrator.references).toHaveLength(0);
  });

  test("read last content coordinates from Sheet data bounds", () => {
    let lastRow: number | null = 4;
    let lastColumn: number | null = 5;
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "spreadsheet" && call.operation === "get-sheet-data-bounds") {
        return {
          lastRow,
          lastColumn,
        };
      }

      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    });
    const { hydrator, sheet } = createFixture({ bridge });

    expect(sheet.getLastRow()).toBe(4);
    expect(sheet.getLastColumn()).toBe(5);

    lastRow = null;
    lastColumn = null;

    expect(sheet.getLastRow()).toBe(0);
    expect(sheet.getLastColumn()).toBe(0);
    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-sheet-data-bounds",
      "get-sheet-data-bounds",
      "get-sheet-data-bounds",
      "get-sheet-data-bounds",
    ]);
    expect(hydrator.references).toHaveLength(0);
  });

  test("read and update frozen Sheet dimensions through the HostBridge", () => {
    let frozenColumns = 0;
    let frozenRows = 0;
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet") {
        throw new Error(`unexpected service: ${call.service}`);
      }

      switch (call.operation) {
        case "get-sheet-metadata":
          return {
            name: "Summary",
            maxRows: 100,
            maxColumns: 26,
            frozenColumns,
            frozenRows,
            hidden: false,
            hiddenGridlines: false,
            rightToLeft: false,
          };
        case "set-sheet-frozen-columns":
          frozenColumns = call.columns;
          return undefined;
        case "set-sheet-frozen-rows":
          frozenRows = call.rows;
          return undefined;
        default:
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }
    });
    const { hydrator, sheet } = createFixture({ bridge });

    expect(sheet.getFrozenColumns()).toBe(0);
    expect(sheet.getFrozenRows()).toBe(0);
    expect(sheet.setFrozenColumns(2)).toBeUndefined();
    expect(sheet.setFrozenRows(3)).toBeUndefined();
    expect(sheet.getFrozenColumns()).toBe(2);
    expect(sheet.getFrozenRows()).toBe(3);
    expect(sheet.setFrozenColumns(0)).toBeUndefined();
    expect(sheet.setFrozenRows(0)).toBeUndefined();
    expect(sheet.getFrozenColumns()).toBe(0);
    expect(sheet.getFrozenRows()).toBe(0);
    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-sheet-metadata",
      "get-sheet-metadata",
      "set-sheet-frozen-columns",
      "set-sheet-frozen-rows",
      "get-sheet-metadata",
      "get-sheet-metadata",
      "set-sheet-frozen-columns",
      "set-sheet-frozen-rows",
      "get-sheet-metadata",
      "get-sheet-metadata",
    ]);
    expect(hydrator.references).toHaveLength(0);
  });

  test("read and update user-hidden Sheet columns through the HostBridge", () => {
    const hiddenColumns = new Set<number>();
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet") {
        throw new Error(`unexpected service: ${call.service}`);
      }

      switch (call.operation) {
        case "get-sheet-column-hidden-by-user":
          return hiddenColumns.has(call.column);
        case "set-sheet-columns-hidden":
          for (
            let column = call.startColumn;
            column < call.startColumn + call.numColumns;
            column += 1
          ) {
            if (call.hidden) {
              hiddenColumns.add(column);
            } else {
              hiddenColumns.delete(column);
            }
          }
          return undefined;
        default:
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }
    });
    const { hydrator, sheet } = createFixture({ bridge });

    expect(sheet.isColumnHiddenByUser(2)).toBe(false);
    expect(sheet.hideColumns(2)).toBeUndefined();
    expect(sheet.hideColumns(4, 2)).toBeUndefined();
    expect(sheet.isColumnHiddenByUser(2)).toBe(true);
    expect(sheet.isColumnHiddenByUser(3)).toBe(false);
    expect(sheet.isColumnHiddenByUser(4)).toBe(true);
    expect(sheet.isColumnHiddenByUser(5)).toBe(true);
    expect(sheet.showColumns(4)).toBeUndefined();
    expect(sheet.showColumns(5, 1)).toBeUndefined();
    expect(sheet.isColumnHiddenByUser(4)).toBe(false);
    expect(sheet.isColumnHiddenByUser(5)).toBe(false);
    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-sheet-column-hidden-by-user",
      "set-sheet-columns-hidden",
      "set-sheet-columns-hidden",
      "get-sheet-column-hidden-by-user",
      "get-sheet-column-hidden-by-user",
      "get-sheet-column-hidden-by-user",
      "get-sheet-column-hidden-by-user",
      "set-sheet-columns-hidden",
      "set-sheet-columns-hidden",
      "get-sheet-column-hidden-by-user",
      "get-sheet-column-hidden-by-user",
    ]);
    expect(hydrator.references).toHaveLength(0);
  });

  test("read and update user-hidden Sheet rows through the HostBridge", () => {
    const hiddenRows = new Set<number>();
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet") {
        throw new Error(`unexpected service: ${call.service}`);
      }

      switch (call.operation) {
        case "get-sheet-row-hidden-by-user":
          return hiddenRows.has(call.row);
        case "set-sheet-rows-hidden":
          for (let row = call.startRow; row < call.startRow + call.numRows; row += 1) {
            if (call.hidden) {
              hiddenRows.add(row);
            } else {
              hiddenRows.delete(row);
            }
          }
          return undefined;
        default:
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }
    });
    const { hydrator, sheet } = createFixture({ bridge });

    expect(sheet.isRowHiddenByUser(2)).toBe(false);
    expect(sheet.hideRows(2)).toBeUndefined();
    expect(sheet.hideRows(4, 2)).toBeUndefined();
    expect(sheet.isRowHiddenByUser(2)).toBe(true);
    expect(sheet.isRowHiddenByUser(3)).toBe(false);
    expect(sheet.isRowHiddenByUser(4)).toBe(true);
    expect(sheet.isRowHiddenByUser(5)).toBe(true);
    expect(sheet.showRows(4)).toBeUndefined();
    expect(sheet.showRows(5, 1)).toBeUndefined();
    expect(sheet.isRowHiddenByUser(4)).toBe(false);
    expect(sheet.isRowHiddenByUser(5)).toBe(false);
    expect(hydrator.references).toHaveLength(0);
  });

  // Public contract:
  // https://developers.google.com/apps-script/reference/spreadsheet/sheet
  test("insert blank Sheet rows through the HostBridge with documented return values", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "spreadsheet" && call.operation === "insert-sheet-rows") {
        return undefined;
      }

      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    });
    const { hydrator, sheet } = createFixture({ bridge });

    expect(sheet.insertRows(2)).toBeUndefined();
    expect(sheet.insertRows(3, 2)).toBeUndefined();
    expect(sheet.insertRowBefore(4)).toBe(sheet);
    expect(sheet.insertRowsBefore(5, 2)).toBe(sheet);
    expect(sheet.insertRowAfter(6)).toBe(sheet);
    expect(sheet.insertRowsAfter(7, 3)).toBe(sheet);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "insert-sheet-rows",
        sheet: defaultSheetReference,
        startRow: 2,
        numRows: 1,
      },
      {
        service: "spreadsheet",
        operation: "insert-sheet-rows",
        sheet: defaultSheetReference,
        startRow: 3,
        numRows: 2,
      },
      {
        service: "spreadsheet",
        operation: "insert-sheet-rows",
        sheet: defaultSheetReference,
        startRow: 4,
        numRows: 1,
      },
      {
        service: "spreadsheet",
        operation: "insert-sheet-rows",
        sheet: defaultSheetReference,
        startRow: 5,
        numRows: 2,
      },
      {
        service: "spreadsheet",
        operation: "insert-sheet-rows",
        sheet: defaultSheetReference,
        startRow: 7,
        numRows: 1,
      },
      {
        service: "spreadsheet",
        operation: "insert-sheet-rows",
        sheet: defaultSheetReference,
        startRow: 8,
        numRows: 3,
      },
    ]);
    expect(hydrator.references).toHaveLength(0);
  });

  test("hide and unhide Sheet rows and columns described by an owned Range", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (
        call.service === "spreadsheet" &&
        (call.operation === "set-sheet-columns-hidden" ||
          call.operation === "set-sheet-rows-hidden")
      ) {
        return undefined;
      }

      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    });
    const { hydrator, sheet } = createFixture({ bridge });
    const range = createVisibilityRangeDouble();

    expect(sheet.hideColumn(range)).toBeUndefined();
    expect(sheet.hideRow(range)).toBeUndefined();
    expect(sheet.unhideColumn(range)).toBeUndefined();
    expect(sheet.unhideRow(range)).toBeUndefined();
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "set-sheet-columns-hidden",
        sheet: defaultSheetReference,
        startColumn: 3,
        numColumns: 2,
        hidden: true,
      },
      {
        service: "spreadsheet",
        operation: "set-sheet-rows-hidden",
        sheet: defaultSheetReference,
        startRow: 2,
        numRows: 4,
        hidden: true,
      },
      {
        service: "spreadsheet",
        operation: "set-sheet-columns-hidden",
        sheet: defaultSheetReference,
        startColumn: 3,
        numColumns: 2,
        hidden: false,
      },
      {
        service: "spreadsheet",
        operation: "set-sheet-rows-hidden",
        sheet: defaultSheetReference,
        startRow: 2,
        numRows: 4,
        hidden: false,
      },
    ]);
    expect(hydrator.references).toHaveLength(0);
  });

  test("reject visibility Ranges from another Sheet or Spreadsheet", () => {
    const { bridge, hydrator, sheet } = createFixture();

    expect(() => sheet.hideRow(createVisibilityRangeDouble({ sheetId: 9 }))).toThrow(
      "visibility Range must belong to this Sheet",
    );
    expect(() =>
      sheet.hideColumn(createVisibilityRangeDouble({ spreadsheetId: "spreadsheet-b" })),
    ).toThrow("visibility Range must belong to this Sheet");
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });

  test("read and update Sheet display state through the HostBridge", () => {
    let hidden = false;
    let hiddenGridlines = false;
    let rightToLeft = false;
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet") {
        throw new Error(`unexpected service: ${call.service}`);
      }

      switch (call.operation) {
        case "get-sheet-metadata":
          return {
            name: "Summary",
            maxRows: 100,
            maxColumns: 26,
            hidden,
            hiddenGridlines,
            rightToLeft,
          };
        case "set-sheet-hidden":
          hidden = call.hidden;
          return undefined;
        case "set-sheet-hidden-gridlines":
          hiddenGridlines = call.hidden;
          return undefined;
        case "set-sheet-right-to-left":
          rightToLeft = call.rightToLeft;
          return undefined;
        default:
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }
    });
    const { hydrator, sheet } = createFixture({ bridge });

    expect(sheet.isSheetHidden()).toBe(false);
    expect(sheet.hasHiddenGridlines()).toBe(false);
    expect(sheet.isRightToLeft()).toBe(false);
    expect(sheet.hideSheet()).toBe(sheet);
    expect(sheet.isSheetHidden()).toBe(true);
    expect(sheet.showSheet()).toBe(sheet);
    expect(sheet.isSheetHidden()).toBe(false);
    expect(sheet.setHiddenGridlines(true)).toBe(sheet);
    expect(sheet.setRightToLeft(true)).toBe(sheet);
    expect(sheet.hasHiddenGridlines()).toBe(true);
    expect(sheet.isRightToLeft()).toBe(true);
    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-sheet-metadata",
      "get-sheet-metadata",
      "get-sheet-metadata",
      "set-sheet-hidden",
      "get-sheet-metadata",
      "set-sheet-hidden",
      "get-sheet-metadata",
      "set-sheet-hidden-gridlines",
      "set-sheet-right-to-left",
      "get-sheet-metadata",
      "get-sheet-metadata",
    ]);
    expect(hydrator.references).toHaveLength(0);
  });

  test("read, update, and reset the Sheet tab color through the HostBridge", () => {
    let tabColor: string | null = null;
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet") {
        throw new Error(`unexpected service: ${call.service}`);
      }

      switch (call.operation) {
        case "get-sheet-metadata":
          return {
            name: "Summary",
            maxRows: 100,
            maxColumns: 26,
            frozenColumns: 0,
            frozenRows: 0,
            hidden: false,
            hiddenGridlines: false,
            rightToLeft: false,
            tabColor,
          };
        case "set-sheet-tab-color":
          tabColor = call.tabColor;
          return undefined;
        default:
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }
    });
    const { hydrator, sheet } = createFixture({ bridge });

    expect(sheet.getTabColor()).toBeNull();
    expect(sheet.setTabColor("#ff0000")).toBe(sheet);
    expect(sheet.getTabColor()).toBe("#ff0000");
    expect(sheet.setTabColor(null)).toBe(sheet);
    expect(sheet.getTabColor()).toBeNull();
    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-sheet-metadata",
      "set-sheet-tab-color",
      "get-sheet-metadata",
      "set-sheet-tab-color",
      "get-sheet-metadata",
    ]);
    expect(hydrator.references).toHaveLength(0);
  });

  test("rename a Sheet through the HostBridge and preserve chaining", () => {
    let name = "Summary";
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "spreadsheet") {
        throw new Error(`unexpected service: ${call.service}`);
      }

      switch (call.operation) {
        case "get-sheet-metadata":
          return {
            name,
            maxRows: 100,
            maxColumns: 26,
            hiddenGridlines: false,
            rightToLeft: false,
          };
        case "rename-sheet":
          name = call.name;
          return undefined;
        default:
          throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
      }
    });
    const { hydrator, sheet } = createFixture({ bridge });

    expect(sheet.getName()).toBe("Summary");
    expect(sheet.setName("Overview")).toBe(sheet);
    expect(sheet.getName()).toBe("Overview");
    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-sheet-metadata",
      "rename-sheet",
      "get-sheet-metadata",
    ]);
    expect(hydrator.references).toHaveLength(0);
  });

  test("clear all Sheet notes through the HostBridge and preserve chaining", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "spreadsheet" && call.operation === "clear-sheet-notes") {
        return undefined;
      }

      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    });
    const { hydrator, sheet } = createFixture({ bridge });

    expect(sheet.clearNotes()).toBe(sheet);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "clear-sheet-notes",
        sheet: defaultSheetReference,
      },
    ]);
    expect(hydrator.references).toHaveLength(0);
  });

  test("clear Sheet contents through data bounds and a hydrated Range", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "spreadsheet" && call.operation === "get-sheet-data-bounds") {
        return {
          lastRow: 2,
          lastColumn: 3,
        };
      }

      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    });
    const { hydrator, rangeDouble, sheet } = createFixture({ bridge });

    expect(sheet.clearContents()).toBe(sheet);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "get-sheet-data-bounds",
        sheet: defaultSheetReference,
      },
    ]);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 1,
        column: 1,
        numRows: 2,
        numColumns: 3,
      },
    ]);
    expect(rangeDouble.clearContentCalls).toHaveLength(1);
    expect(rangeDouble.getValuesCalls).toHaveLength(0);
  });

  test("hydrate the Sheet data range from content bounds", () => {
    let lastRow: number | null = 4;
    let lastColumn: number | null = 5;
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "spreadsheet" && call.operation === "get-sheet-data-bounds") {
        return {
          lastRow,
          lastColumn,
        };
      }

      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    });
    const { hydrator, rangeDouble, sheet } = createFixture({ bridge });

    expect(sheet.getDataRange()).toBe(rangeDouble.range);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 1,
        column: 1,
        numRows: 4,
        numColumns: 5,
      },
    ]);

    lastRow = null;
    lastColumn = null;

    expect(sheet.getDataRange()).toBe(rangeDouble.range);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 1,
        column: 1,
        numRows: 4,
        numColumns: 5,
      },
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
    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-sheet-data-bounds",
      "get-sheet-data-bounds",
    ]);
    expect(rangeDouble.clearContentCalls).toHaveLength(0);
    expect(rangeDouble.getValuesCalls).toHaveLength(0);
  });

  test("leave an empty Sheet unchanged when clearing contents", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "spreadsheet" && call.operation === "get-sheet-data-bounds") {
        return {
          lastRow: null,
          lastColumn: null,
        };
      }

      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    });
    const { hydrator, rangeDouble, sheet } = createFixture({ bridge });

    expect(sheet.clearContents()).toBe(sheet);
    expect(bridge.calls).toHaveLength(1);
    expect(bridge.calls[0]?.operation).toBe("get-sheet-data-bounds");
    expect(hydrator.references).toHaveLength(0);
    expect(rangeDouble.clearContentCalls).toHaveLength(0);
    expect(rangeDouble.getValuesCalls).toHaveLength(0);
  });

  test("read Sheet values through a hydrated Range", () => {
    const values = [
      ["Vegas", new Date("2026-09-18T00:00:00.000Z")],
      [42, true],
    ] as const;
    const { bridge, hydrator, rangeDouble, sheet } = createFixture({
      rangeValues: values,
    });

    expect(sheet.getSheetValues(2, 3, 2, 2)).toStrictEqual(values);
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 2,
        column: 3,
        numRows: 2,
        numColumns: 2,
      },
    ]);
    expect(rangeDouble.getValuesCalls).toHaveLength(1);
    expect(rangeDouble.clearContentCalls).toHaveLength(0);
  });

  test("resolve -1 Sheet value start coordinates from data bounds", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "spreadsheet" && call.operation === "get-sheet-data-bounds") {
        return {
          lastRow: 4,
          lastColumn: 5,
        };
      }

      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    });
    const { hydrator, rangeDouble, sheet } = createFixture({
      bridge,
      rangeValues: [["last"]],
    });

    expect(sheet.getSheetValues(-1, -1, 1, 1)).toStrictEqual([["last"]]);
    expect(bridge.calls).toStrictEqual([
      {
        service: "spreadsheet",
        operation: "get-sheet-data-bounds",
        sheet: defaultSheetReference,
      },
    ]);
    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 4,
        column: 5,
        numRows: 1,
        numColumns: 1,
      },
    ]);
    expect(rangeDouble.getValuesCalls).toHaveLength(1);
  });

  test("reject invalid Sheet value start coordinates before crossing collaborators", () => {
    const { bridge, hydrator, sheet } = createFixture();

    expect(() => sheet.getSheetValues(0, 1, 1, 1)).toThrow(
      "startRow must be -1 or a positive integer",
    );
    expect(() => sheet.getSheetValues(-2, 1, 1, 1)).toThrow(
      "startRow must be -1 or a positive integer",
    );
    expect(() => sheet.getSheetValues(1, 0, 1, 1)).toThrow(
      "startColumn must be -1 or a positive integer",
    );
    expect(() => sheet.getSheetValues(1, -2, 1, 1)).toThrow(
      "startColumn must be -1 or a positive integer",
    );
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });

  test("reject -1 Sheet value coordinates when the Sheet has no data", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "spreadsheet" && call.operation === "get-sheet-data-bounds") {
        return {
          lastRow: null,
          lastColumn: null,
        };
      }

      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    });
    const { hydrator, sheet } = createFixture({ bridge });

    expect(() => sheet.getSheetValues(-1, 1, 1, 1)).toThrow("has no data row");
    expect(bridge.calls).toHaveLength(1);
    expect(hydrator.references).toHaveLength(0);
  });

  test("hydrate documented A1 and R1C1 Sheet ranges", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "spreadsheet" && call.operation === "get-sheet-metadata") {
        return {
          maxRows: 100,
          maxColumns: 26,
        };
      }

      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    });
    const { hydrator, rangeDouble, sheet } = createFixture({ bridge });

    expect(sheet.getRange("B2:D4")).toBe(rangeDouble.range);
    expect(sheet.getRange("R5C6:R7C8")).toBe(rangeDouble.range);
    expect(sheet.getRange("B:D")).toBe(rangeDouble.range);

    expect(hydrator.references).toStrictEqual([
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 2,
        column: 2,
        numRows: 3,
        numColumns: 3,
      },
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 5,
        column: 6,
        numRows: 3,
        numColumns: 3,
      },
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-a",
        sheetId: 7,
        row: 1,
        column: 2,
        numRows: 100,
        numColumns: 3,
        startRowBounded: false,
        endRowBounded: false,
      },
    ]);
    expect(bridge.calls.map(({ operation }) => operation)).toStrictEqual([
      "get-sheet-metadata",
      "get-sheet-metadata",
      "get-sheet-metadata",
    ]);
  });

  test("fail closed for Sheet range notation not modeled locally", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "spreadsheet" && call.operation === "get-sheet-metadata") {
        return {
          maxRows: 100,
          maxColumns: 26,
        };
      }

      throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
    });
    const { hydrator, sheet } = createFixture({ bridge });

    expect(() => sheet.getRange("R[1]C[1]")).toThrow(
      "Local Runtime does not support Sheet.getRange(a1Notation)",
    );
    expect(() => sheet.getRange("Other!A1")).toThrow(
      "Local Runtime does not support Sheet.getRange(a1Notation)",
    );
    expect(hydrator.references).toHaveLength(0);
  });

  test("reject invalid numeric Range coordinates before hydration", () => {
    const { bridge, hydrator, sheet } = createFixture();

    expect(() => sheet.getRange(0, 1)).toThrow("row must be a positive integer");
    expect(() => sheet.getRange(1, 0)).toThrow("column must be a positive integer");
    expect(() => sheet.getRange(1, 1, 0)).toThrow("numRows must be a positive integer");
    expect(() => sheet.getRange(1, 1, 1, 0)).toThrow("numColumns must be a positive integer");
    expect(bridge.calls).toHaveLength(0);
    expect(hydrator.references).toHaveLength(0);
  });
});
