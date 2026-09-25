import { describe, expect, test } from "vitest";

import {
  Range,
  Sheet,
  Spreadsheet,
  createSpreadsheetObjectHydrator,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type SheetMetadata,
  type SheetReference,
} from "./index";

const SHEET = {
  service: "spreadsheet",
  kind: "sheet",
  spreadsheetId: "spreadsheet-a",
  sheetId: 7,
} as const satisfies SheetReference;

const OTHER_SHEET = {
  service: "spreadsheet",
  kind: "sheet",
  spreadsheetId: "spreadsheet-a",
  sheetId: 5,
} as const satisfies SheetReference;

class SheetContractBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly hiddenColumns = new Set<number>();
  readonly hiddenRows = new Set<number>();

  #metadata: SheetMetadata = {
    name: "Summary",
    maxRows: 100,
    maxColumns: 26,
    frozenColumns: 1,
    frozenRows: 2,
    hidden: false,
    hiddenGridlines: false,
    rightToLeft: false,
    tabColor: null,
  };

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "spreadsheet") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    switch (call.operation) {
      case "get-sheet-metadata":
        return { ...this.#metadata } as unknown as HostCallResult<C>;
      case "get-sheet-data-bounds":
        return {
          lastRow: 2,
          lastColumn: 3,
        } as unknown as HostCallResult<C>;
      case "list-sheets":
        return [OTHER_SHEET, SHEET] as unknown as HostCallResult<C>;
      case "get-sheet-column-hidden-by-user":
        return this.hiddenColumns.has(call.column) as unknown as HostCallResult<C>;
      case "get-sheet-row-hidden-by-user":
        return this.hiddenRows.has(call.row) as unknown as HostCallResult<C>;
      case "set-sheet-columns-hidden":
        for (
          let column = call.startColumn;
          column < call.startColumn + call.numColumns;
          column += 1
        ) {
          if (call.hidden) {
            this.hiddenColumns.add(column);
          } else {
            this.hiddenColumns.delete(column);
          }
        }
        return undefined as unknown as HostCallResult<C>;
      case "set-sheet-rows-hidden":
        for (let row = call.startRow; row < call.startRow + call.numRows; row += 1) {
          if (call.hidden) {
            this.hiddenRows.add(row);
          } else {
            this.hiddenRows.delete(row);
          }
        }
        return undefined as unknown as HostCallResult<C>;
      case "rename-sheet":
        this.#metadata = {
          ...this.#metadata,
          name: call.name,
        };
        return undefined as unknown as HostCallResult<C>;
      case "set-sheet-frozen-columns":
        this.#metadata = {
          ...this.#metadata,
          frozenColumns: call.columns,
        };
        return undefined as unknown as HostCallResult<C>;
      case "set-sheet-frozen-rows":
        this.#metadata = {
          ...this.#metadata,
          frozenRows: call.rows,
        };
        return undefined as unknown as HostCallResult<C>;
      case "set-sheet-hidden":
        this.#metadata = {
          ...this.#metadata,
          hidden: call.hidden,
        };
        return undefined as unknown as HostCallResult<C>;
      case "set-sheet-hidden-gridlines":
        this.#metadata = {
          ...this.#metadata,
          hiddenGridlines: call.hidden,
        };
        return undefined as unknown as HostCallResult<C>;
      case "set-sheet-right-to-left":
        this.#metadata = {
          ...this.#metadata,
          rightToLeft: call.rightToLeft,
        };
        return undefined as unknown as HostCallResult<C>;
      case "set-sheet-tab-color":
        this.#metadata = {
          ...this.#metadata,
          tabColor: call.tabColor,
        };
        return undefined as unknown as HostCallResult<C>;
      case "clear-sheet-notes":
      case "set-range-values":
        return undefined as unknown as HostCallResult<C>;
      case "get-range-values":
        return [
          ["Vegas", 42],
          [true, "Runtime"],
        ] as unknown as HostCallResult<C>;
      default:
        throw new Error("unexpected Spreadsheet operation");
    }
  }
}

function createFixture() {
  const bridge = new SheetContractBridge();
  const sheet = new Sheet(bridge, SHEET, createSpreadsheetObjectHydrator(bridge));

  return {
    bridge,
    sheet,
  };
}

// Public contract:
// https://developers.google.com/apps-script/reference/spreadsheet/sheet
describe("Sheet public contract", () => {
  test("append, clear, and read Sheet data through documented row and range APIs", () => {
    const { bridge, sheet } = createFixture();

    expect(sheet.appendRow(["Appended", 7])).toBe(sheet);
    expect(() => sheet.appendRow(["=SUM(A1:A2)"])).toThrow("formula evaluation is not modeled");

    const dataRange = sheet.getDataRange();

    expect(dataRange).toBeInstanceOf(Range);
    expect(dataRange.getA1Notation()).toBe("A1:C2");

    expect(sheet.getLastRow()).toBe(2);
    expect(sheet.getLastColumn()).toBe(3);
    expect(sheet.getSheetValues(1, 1, 2, 2)).toStrictEqual([
      ["Vegas", 42],
      [true, "Runtime"],
    ]);

    expect(sheet.clearContents()).toBe(sheet);
    expect(sheet.clearNotes()).toBe(sheet);

    expect(bridge.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "set-range-values",
          range: expect.objectContaining({
            row: 3,
            column: 1,
            numRows: 1,
            numColumns: 2,
          }),
          values: [["Appended", 7]],
        }),
        expect.objectContaining({
          operation: "clear-sheet-notes",
          sheet: SHEET,
        }),
      ]),
    );
  });

  test("expose documented Sheet metadata, identity, parent, and type", () => {
    const { sheet } = createFixture();

    expect(sheet.getFrozenColumns()).toBe(1);
    expect(sheet.getFrozenRows()).toBe(2);
    expect(sheet.getIndex()).toBe(2);
    expect(sheet.getMaxColumns()).toBe(26);
    expect(sheet.getMaxRows()).toBe(100);
    expect(sheet.getName()).toBe("Summary");
    expect(sheet.getSheetName()).toBe("Summary");
    expect(sheet.getSheetId()).toBe(7);
    expect(sheet.getTabColor()).toBeNull();
    expect(sheet.getType()).toBe("GRID");
    expect(sheet.asDataSourceSheet()).toBeNull();
    expect(sheet.hasHiddenGridlines()).toBe(false);
    expect(sheet.isRightToLeft()).toBe(false);
    expect(sheet.isSheetHidden()).toBe(false);
    expect(sheet.getParent()).toBeInstanceOf(Spreadsheet);
  });

  test("hide and show rows and columns through positions and owned Ranges", () => {
    const { sheet } = createFixture();
    const visibilityRange = sheet.getRange(2, 3, 2, 2);

    expect(sheet.hideColumns(2)).toBeUndefined();
    expect(sheet.hideRows(4, 2)).toBeUndefined();
    expect(sheet.hideColumn(visibilityRange)).toBeUndefined();
    expect(sheet.hideRow(visibilityRange)).toBeUndefined();

    expect(sheet.isColumnHiddenByUser(2)).toBe(true);
    expect(sheet.isColumnHiddenByUser(3)).toBe(true);
    expect(sheet.isColumnHiddenByUser(4)).toBe(true);
    expect(sheet.isRowHiddenByUser(2)).toBe(true);
    expect(sheet.isRowHiddenByUser(3)).toBe(true);
    expect(sheet.isRowHiddenByUser(4)).toBe(true);
    expect(sheet.isRowHiddenByUser(5)).toBe(true);

    expect(sheet.showColumns(2)).toBeUndefined();
    expect(sheet.showRows(4, 2)).toBeUndefined();
    expect(sheet.unhideColumn(visibilityRange)).toBeUndefined();
    expect(sheet.unhideRow(visibilityRange)).toBeUndefined();

    expect(sheet.isColumnHiddenByUser(2)).toBe(false);
    expect(sheet.isColumnHiddenByUser(3)).toBe(false);
    expect(sheet.isColumnHiddenByUser(4)).toBe(false);
    expect(sheet.isRowHiddenByUser(2)).toBe(false);
    expect(sheet.isRowHiddenByUser(3)).toBe(false);
    expect(sheet.isRowHiddenByUser(4)).toBe(false);
    expect(sheet.isRowHiddenByUser(5)).toBe(false);
  });

  test("update documented Sheet display and frozen state with the documented return contracts", () => {
    const { sheet } = createFixture();

    expect(sheet.setName("Overview")).toBe(sheet);
    expect(sheet.getName()).toBe("Overview");

    expect(sheet.setFrozenColumns(3)).toBeUndefined();
    expect(sheet.setFrozenRows(4)).toBeUndefined();
    expect(sheet.getFrozenColumns()).toBe(3);
    expect(sheet.getFrozenRows()).toBe(4);

    expect(sheet.setHiddenGridlines(true)).toBe(sheet);
    expect(sheet.hasHiddenGridlines()).toBe(true);

    expect(sheet.setRightToLeft(true)).toBe(sheet);
    expect(sheet.isRightToLeft()).toBe(true);

    expect(sheet.setTabColor("#ff0000")).toBe(sheet);
    expect(sheet.getTabColor()).toBe("#ff0000");

    expect(sheet.hideSheet()).toBe(sheet);
    expect(sheet.isSheetHidden()).toBe(true);
    expect(sheet.showSheet()).toBe(sheet);
    expect(sheet.isSheetHidden()).toBe(false);
  });

  test("create numeric and notation Ranges while failing closed for unsupported notation", () => {
    const { sheet } = createFixture();

    expect(sheet.getRange(2, 3)).toBeInstanceOf(Range);
    expect(sheet.getRange(2, 3, 4)).toBeInstanceOf(Range);
    expect(sheet.getRange(2, 3, 4, 5)).toBeInstanceOf(Range);

    expect(sheet.getRange("B2:D4").getA1Notation()).toBe("B2:D4");
    expect(sheet.getRange("R5C6:R7C8").getA1Notation()).toBe("F5:H7");
    expect(sheet.getRange("B:D").getA1Notation()).toBe("B1:D100");

    expect(() => sheet.getRange("R[1]C[1]")).toThrow(
      "Local Runtime does not support Sheet.getRange(a1Notation)",
    );
  });
});
