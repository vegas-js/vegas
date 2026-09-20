import type { HostBridge } from "./host-bridge";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import type { RangeReference } from "./spreadsheet-reference";
import type { Sheet } from "./spreadsheet-sheet";
import type { SpreadsheetCellValue, SpreadsheetGrid } from "./spreadsheet-store";
import { assertInteger, assertPositiveInteger } from "./spreadsheet-validation";

function cloneCellValue(value: SpreadsheetCellValue): SpreadsheetCellValue {
  return value instanceof Date ? new Date(value.getTime()) : value;
}

function cloneGrid(values: SpreadsheetGrid): SpreadsheetCellValue[][] {
  return values.map((row) => row.map(cloneCellValue));
}

const A1_COLUMN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function formatA1Cell(row: number, column: number): string {
  let columnIndex = column;
  let columnName = "";

  while (columnIndex > 0) {
    columnIndex -= 1;
    columnName = A1_COLUMN_ALPHABET.charAt(columnIndex % 26) + columnName;
    columnIndex = Math.floor(columnIndex / 26);
  }

  return `${columnName}${row}`;
}

// https://developers.google.com/apps-script/reference/spreadsheet/range
export class Range {
  readonly #bridge: HostBridge;
  readonly #reference: RangeReference;
  readonly #hydrator: SpreadsheetObjectHydrator;

  constructor(bridge: HostBridge, reference: RangeReference, hydrator: SpreadsheetObjectHydrator) {
    this.#bridge = bridge;
    this.#reference = reference;
    this.#hydrator = hydrator;
  }

  canEdit(): boolean {
    // Apps Script bases this result on spreadsheet permissions and protections.
    // Vegas does not model either yet, so every local Range is editable.
    return true;
  }

  clearContent(): Range {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-range-values",
      range: this.#reference,
      values: Array.from({ length: this.#reference.numRows }, () =>
        Array.from({ length: this.#reference.numColumns }, () => ""),
      ),
    });

    return this;
  }

  getA1Notation(): string {
    const start = formatA1Cell(this.#reference.row, this.#reference.column);
    const end = formatA1Cell(
      this.#reference.row + this.#reference.numRows - 1,
      this.#reference.column + this.#reference.numColumns - 1,
    );

    return start === end ? start : `${start}:${end}`;
  }

  getCell(row: number, column: number): Range {
    assertPositiveInteger(row, "Spreadsheet range cell row");
    assertPositiveInteger(column, "Spreadsheet range cell column");

    if (row > this.#reference.numRows || column > this.#reference.numColumns) {
      throw new RangeError("Spreadsheet range cell is outside the range.");
    }

    return this.#hydrator.hydrate({
      service: "spreadsheet",
      kind: "range",
      spreadsheetId: this.#reference.spreadsheetId,
      sheetId: this.#reference.sheetId,
      row: this.#reference.row + row - 1,
      column: this.#reference.column + column - 1,
      numRows: 1,
      numColumns: 1,
    });
  }

  getColumn(): number {
    return this.#reference.column;
  }

  getGridId(): number {
    return this.#reference.sheetId;
  }

  getHeight(): number {
    return this.#reference.numRows;
  }

  getLastColumn(): number {
    return this.#reference.column + this.#reference.numColumns - 1;
  }

  getLastRow(): number {
    return this.#reference.row + this.#reference.numRows - 1;
  }

  getNumColumns(): number {
    return this.#reference.numColumns;
  }

  getNumRows(): number {
    return this.#reference.numRows;
  }

  getRow(): number {
    return this.#reference.row;
  }

  getRowIndex(): number {
    return this.#reference.row;
  }

  getWidth(): number {
    return this.#reference.numColumns;
  }

  getSheet(): Sheet {
    return this.#hydrator.hydrate({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: this.#reference.spreadsheetId,
      sheetId: this.#reference.sheetId,
    });
  }

  getValue(): SpreadsheetCellValue {
    const values = this.#bridge.call({
      service: "spreadsheet",
      operation: "get-range-values",
      range: this.#reference,
    });

    return cloneCellValue(values[0]![0]!);
  }

  getValues(): SpreadsheetCellValue[][] {
    return cloneGrid(
      this.#bridge.call({
        service: "spreadsheet",
        operation: "get-range-values",
        range: this.#reference,
      }),
    );
  }

  isBlank(): boolean {
    return this.getValues().every((row) => row.every((value) => value === ""));
  }

  isEndColumnBounded(): boolean {
    // Vegas currently represents only explicit rectangular Ranges, so both column bounds exist.
    return true;
  }

  isEndRowBounded(): boolean {
    // Vegas currently represents only explicit rectangular Ranges, so both row bounds exist.
    return true;
  }

  isStartColumnBounded(): boolean {
    // Vegas currently represents only explicit rectangular Ranges, so both column bounds exist.
    return true;
  }

  isStartRowBounded(): boolean {
    // Vegas currently represents only explicit rectangular Ranges, so both row bounds exist.
    return true;
  }

  offset(rowOffset: number, columnOffset: number): Range;
  offset(rowOffset: number, columnOffset: number, numRows: number): Range;
  offset(rowOffset: number, columnOffset: number, numRows: number, numColumns: number): Range;
  offset(
    rowOffset: number,
    columnOffset: number,
    numRows = this.#reference.numRows,
    numColumns = this.#reference.numColumns,
  ): Range {
    assertInteger(rowOffset, "Spreadsheet range rowOffset");
    assertInteger(columnOffset, "Spreadsheet range columnOffset");
    assertPositiveInteger(numRows, "Spreadsheet range numRows");
    assertPositiveInteger(numColumns, "Spreadsheet range numColumns");

    const row = this.#reference.row + rowOffset;
    const column = this.#reference.column + columnOffset;
    assertPositiveInteger(row, "Spreadsheet range row");
    assertPositiveInteger(column, "Spreadsheet range column");

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

  setValue(value: SpreadsheetCellValue): Range {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-range-values",
      range: this.#reference,
      values: [[value]],
    });

    return this;
  }

  setValues(values: SpreadsheetGrid): Range {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-range-values",
      range: this.#reference,
      values,
    });

    return this;
  }
}
