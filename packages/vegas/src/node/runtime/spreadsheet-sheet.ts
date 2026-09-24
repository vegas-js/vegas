import type { HostBridge } from "./host-bridge";
import { SPREADSHEET_SHEET_TYPE, type SpreadsheetSheetType } from "./spreadsheet-enum";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import type { Range } from "./spreadsheet-range";
import type { SheetReference } from "./spreadsheet-reference";
import type { Spreadsheet } from "./spreadsheet-spreadsheet";
import type { SpreadsheetCellValue } from "./spreadsheet-store";
import { assertInteger, assertPositiveInteger } from "./spreadsheet-validation";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

// https://developers.google.com/apps-script/reference/spreadsheet/sheet
export class Sheet {
  readonly #bridge: HostBridge;
  readonly #reference: SheetReference;
  readonly #hydrator: SpreadsheetObjectHydrator;

  constructor(bridge: HostBridge, reference: SheetReference, hydrator: SpreadsheetObjectHydrator) {
    this.#bridge = bridge;
    this.#reference = reference;
    this.#hydrator = hydrator;
  }

  appendRow(rowContents: SpreadsheetCellValue[]): Sheet {
    if (rowContents.length === 0) {
      // Apps Script does not document appendRow([]). Vegas rejects an empty row because a
      // Spreadsheet Range cannot contain zero columns.
      throw new RangeError("Spreadsheet appended row must contain at least one value.");
    }

    if (rowContents.some((value) => typeof value === "string" && value.startsWith("="))) {
      // Apps Script evaluates leading-equals values as formulas. Formula evaluation is not yet
      // modeled by the local Runtime, so Vegas rejects them instead of silently storing text.
      throw new UnsupportedRuntimeOperationError(
        "Sheet.appendRow() with formula values",
        "formula evaluation is not modeled.",
      );
    }

    const row = (this.#dataBounds().lastRow ?? 0) + 1;
    this.getRange(row, 1, 1, rowContents.length).setValues([rowContents]);

    return this;
  }

  asDataSourceSheet(): GoogleAppsScript.Spreadsheet.DataSourceSheet | null {
    // The local Spreadsheet model currently creates only standard grid sheets.
    return null;
  }

  clearContents(): Sheet {
    const bounds = this.#dataBounds();

    if (bounds.lastRow === null || bounds.lastColumn === null) {
      return this;
    }

    this.getRange(1, 1, bounds.lastRow, bounds.lastColumn).clearContent();

    return this;
  }

  clearNotes(): Sheet {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "clear-sheet-notes",
      sheet: this.#reference,
    });

    return this;
  }

  getDataRange(): Range {
    const bounds = this.#dataBounds();

    // Google Apps Script defines getDataRange() from A1 through the last content coordinates,
    // but does not document the empty-Sheet result. Vegas returns A1 to preserve a valid Range.
    if (bounds.lastRow === null || bounds.lastColumn === null) {
      return this.getRange(1, 1);
    }

    return this.getRange(1, 1, bounds.lastRow, bounds.lastColumn);
  }

  getFrozenColumns(): number {
    return this.#metadata().frozenColumns;
  }

  getFrozenRows(): number {
    return this.#metadata().frozenRows;
  }

  getIndex(): number {
    const index = this.#bridge
      .call({
        service: "spreadsheet",
        operation: "list-sheets",
        spreadsheet: {
          service: "spreadsheet",
          kind: "spreadsheet",
          id: this.#reference.spreadsheetId,
        },
      })
      .findIndex(({ sheetId }) => sheetId === this.#reference.sheetId);

    if (index < 0) {
      throw new Error("Spreadsheet sheet is not present in its parent.");
    }

    return index + 1;
  }

  // Google Apps Script does not document the return value for an empty Sheet.
  // Vegas normalizes missing local data bounds to 0 for these 1-based position accessors.
  getLastColumn(): number {
    return this.#dataBounds().lastColumn ?? 0;
  }

  getLastRow(): number {
    return this.#dataBounds().lastRow ?? 0;
  }

  getMaxColumns(): number {
    return this.#metadata().maxColumns;
  }

  getMaxRows(): number {
    return this.#metadata().maxRows;
  }

  getName(): string {
    return this.#metadata().name;
  }

  hasHiddenGridlines(): boolean {
    return this.#metadata().hiddenGridlines;
  }

  hideColumn(column: Range): void {
    this.#assertRangeBelongsToSheet(column);
    this.hideColumns(column.getColumn(), column.getNumColumns());
  }

  hideColumns(columnIndex: number): void;
  hideColumns(columnIndex: number, numColumns: number): void;
  hideColumns(columnIndex: number, numColumns = 1): void {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-sheet-columns-hidden",
      sheet: this.#reference,
      startColumn: columnIndex,
      numColumns,
      hidden: true,
    });
  }

  hideRow(row: Range): void {
    this.#assertRangeBelongsToSheet(row);
    this.hideRows(row.getRow(), row.getNumRows());
  }

  hideRows(rowIndex: number): void;
  hideRows(rowIndex: number, numRows: number): void;
  hideRows(rowIndex: number, numRows = 1): void {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-sheet-rows-hidden",
      sheet: this.#reference,
      startRow: rowIndex,
      numRows,
      hidden: true,
    });
  }

  hideSheet(): Sheet {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-sheet-hidden",
      sheet: this.#reference,
      hidden: true,
    });

    return this;
  }

  getSheetName(): string {
    return this.getName();
  }

  /** @deprecated Replaced by getTabColorObject() in Apps Script. */
  getTabColor(): string | null {
    return this.#metadata().tabColor;
  }

  getType(): SpreadsheetSheetType {
    // The local Spreadsheet model currently creates only standard grid sheets.
    return SPREADSHEET_SHEET_TYPE.GRID;
  }

  setName(name: string): Sheet {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "rename-sheet",
      sheet: this.#reference,
      name,
    });

    return this;
  }

  isColumnHiddenByUser(columnPosition: number): boolean {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "get-sheet-column-hidden-by-user",
      sheet: this.#reference,
      column: columnPosition,
    });
  }

  isRowHiddenByUser(rowPosition: number): boolean {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "get-sheet-row-hidden-by-user",
      sheet: this.#reference,
      row: rowPosition,
    });
  }

  isRightToLeft(): boolean {
    return this.#metadata().rightToLeft;
  }

  isSheetHidden(): boolean {
    return this.#metadata().hidden;
  }

  setFrozenColumns(columns: number): void {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-sheet-frozen-columns",
      sheet: this.#reference,
      columns,
    });
  }

  setFrozenRows(rows: number): void {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-sheet-frozen-rows",
      sheet: this.#reference,
      rows,
    });
  }

  setHiddenGridlines(hideGridlines: boolean): Sheet {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-sheet-hidden-gridlines",
      sheet: this.#reference,
      hidden: hideGridlines,
    });

    return this;
  }

  setRightToLeft(rightToLeft: boolean): Sheet {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-sheet-right-to-left",
      sheet: this.#reference,
      rightToLeft,
    });

    return this;
  }

  setTabColor(color: string | null): Sheet {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-sheet-tab-color",
      sheet: this.#reference,
      tabColor: color,
    });

    return this;
  }

  showColumns(columnIndex: number): void;
  showColumns(columnIndex: number, numColumns: number): void;
  showColumns(columnIndex: number, numColumns = 1): void {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-sheet-columns-hidden",
      sheet: this.#reference,
      startColumn: columnIndex,
      numColumns,
      hidden: false,
    });
  }

  showRows(rowIndex: number): void;
  showRows(rowIndex: number, numRows: number): void;
  showRows(rowIndex: number, numRows = 1): void {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-sheet-rows-hidden",
      sheet: this.#reference,
      startRow: rowIndex,
      numRows,
      hidden: false,
    });
  }

  unhideColumn(column: Range): void {
    this.#assertRangeBelongsToSheet(column);
    this.showColumns(column.getColumn(), column.getNumColumns());
  }

  unhideRow(row: Range): void {
    this.#assertRangeBelongsToSheet(row);
    this.showRows(row.getRow(), row.getNumRows());
  }

  showSheet(): Sheet {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-sheet-hidden",
      sheet: this.#reference,
      hidden: false,
    });

    return this;
  }

  getParent(): Spreadsheet {
    return this.#hydrator.hydrate({
      service: "spreadsheet",
      kind: "spreadsheet",
      id: this.#reference.spreadsheetId,
    });
  }

  getRange(row: number, column: number): Range;
  getRange(row: number, column: number, numRows: number): Range;
  getRange(row: number, column: number, numRows: number, numColumns: number): Range;
  getRange(row: number, column: number, numRows = 1, numColumns = 1): Range {
    assertPositiveInteger(row, "Spreadsheet range row");
    assertPositiveInteger(column, "Spreadsheet range column");
    assertPositiveInteger(numRows, "Spreadsheet range numRows");
    assertPositiveInteger(numColumns, "Spreadsheet range numColumns");

    return this.#hydrator.hydrate({
      service: "spreadsheet",
      kind: "range",
      spreadsheetId: this.#reference.spreadsheetId,
      sheetId: this.#reference.sheetId,
      row,
      column,
      numRows,
      numColumns,
    });
  }

  getSheetId(): number {
    return this.#reference.sheetId;
  }

  getSheetValues(
    startRow: number,
    startColumn: number,
    numRows: number,
    numColumns: number,
  ): SpreadsheetCellValue[][] {
    assertInteger(startRow, "Spreadsheet sheet startRow");
    assertInteger(startColumn, "Spreadsheet sheet startColumn");
    assertPositiveInteger(numRows, "Spreadsheet sheet numRows");
    assertPositiveInteger(numColumns, "Spreadsheet sheet numColumns");

    if (startRow === 0 || startRow < -1) {
      throw new RangeError("Spreadsheet sheet startRow must be -1 or a positive integer.");
    }
    if (startColumn === 0 || startColumn < -1) {
      throw new RangeError("Spreadsheet sheet startColumn must be -1 or a positive integer.");
    }

    let row = startRow;
    let column = startColumn;

    if (row === -1 || column === -1) {
      const bounds = this.#dataBounds();

      if (row === -1) {
        if (bounds.lastRow === null) {
          throw new RangeError("Spreadsheet sheet has no data row.");
        }
        row = bounds.lastRow;
      }
      if (column === -1) {
        if (bounds.lastColumn === null) {
          throw new RangeError("Spreadsheet sheet has no data column.");
        }
        column = bounds.lastColumn;
      }
    }

    return this.getRange(row, column, numRows, numColumns).getValues();
  }

  #dataBounds() {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "get-sheet-data-bounds",
      sheet: this.#reference,
    });
  }

  #assertRangeBelongsToSheet(range: Range): void {
    const rangeSheet = range.getSheet();

    if (
      rangeSheet.getSheetId() !== this.#reference.sheetId ||
      rangeSheet.getParent().getId() !== this.#reference.spreadsheetId
    ) {
      // Apps Script does not document cross-Sheet Range behavior for visibility methods.
      // Vegas rejects foreign Ranges instead of applying their coordinates to this Sheet.
      throw new RangeError("Spreadsheet visibility Range must belong to this Sheet.");
    }
  }

  #metadata() {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "get-sheet-metadata",
      sheet: this.#reference,
    });
  }
}
