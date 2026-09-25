import type { HostBridge } from "./host-bridge";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import type { RangeReference } from "./spreadsheet-reference";
import type { Sheet } from "./spreadsheet-sheet";
import type {
  SpreadsheetCellValue,
  SpreadsheetGrid,
  SpreadsheetNoteGrid,
} from "./spreadsheet-store";
import { assertInteger, assertPositiveInteger } from "./spreadsheet-validation";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

function cloneCellValue(value: SpreadsheetCellValue): SpreadsheetCellValue {
  return value instanceof Date ? new Date(value.getTime()) : value;
}

function cloneGrid(values: SpreadsheetGrid): SpreadsheetCellValue[][] {
  return values.map((row) => row.map(cloneCellValue));
}

function trimCellWhitespace(value: SpreadsheetCellValue): SpreadsheetCellValue {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
}

function assertFormulaValuesSupported(values: SpreadsheetGrid, operation: string): void {
  if (
    values.some((row) => row.some((value) => typeof value === "string" && value.startsWith("=")))
  ) {
    throw new UnsupportedRuntimeOperationError(operation, "formula evaluation is not modeled.");
  }
}

function createDuplicateCellKey(value: SpreadsheetCellValue): string {
  if (value instanceof Date) {
    return `date:${value.getTime()}`;
  }

  if (typeof value === "string") {
    // Apps Script documents case-insensitive duplicate matching, but not locale-specific casing
    // rules. Vegas uses JavaScript's locale-independent Unicode lowercase conversion.
    return `string:${value.toLowerCase()}`;
  }

  return `${typeof value}:${String(value)}`;
}

function createDuplicateRowKey(
  row: readonly SpreadsheetCellValue[],
  columnOffsets: readonly number[],
): string {
  return JSON.stringify(columnOffsets.map((offset) => createDuplicateCellKey(row[offset]!)));
}

const A1_COLUMN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function formatA1Column(column: number): string {
  let columnIndex = column;
  let columnName = "";

  while (columnIndex > 0) {
    columnIndex -= 1;
    columnName = A1_COLUMN_ALPHABET.charAt(columnIndex % 26) + columnName;
    columnIndex = Math.floor(columnIndex / 26);
  }

  return columnName;
}

function formatA1Cell(row: number, column: number): string {
  return `${formatA1Column(column)}${row}`;
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

  clearNote(): Range {
    return this.setNotes(
      Array.from({ length: this.#reference.numRows }, () =>
        Array.from({ length: this.#reference.numColumns }, () => null),
      ),
    );
  }

  clearContent(): Range {
    return this.#writeValues(
      Array.from({ length: this.#reference.numRows }, () =>
        Array.from({ length: this.#reference.numColumns }, () => ""),
      ),
    );
  }

  getA1Notation(): string {
    const endRow = this.#reference.row + this.#reference.numRows - 1;
    const endColumn = this.#reference.column + this.#reference.numColumns - 1;

    if (!this.isStartRowBounded() && !this.isEndRowBounded()) {
      return `${formatA1Column(this.#reference.column)}:${formatA1Column(endColumn)}`;
    }

    if (!this.isStartColumnBounded() && !this.isEndColumnBounded()) {
      return `${this.#reference.row}:${endRow}`;
    }

    const start = formatA1Cell(this.#reference.row, this.#reference.column);
    const end = formatA1Cell(endRow, endColumn);

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

  getNote(): string {
    return this.getNotes()[0]![0]!;
  }

  getNotes(): string[][] {
    return this.#bridge
      .call({
        service: "spreadsheet",
        operation: "get-range-notes",
        range: this.#reference,
      })
      .map((row) => row.map((note) => note ?? ""));
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
    return this.#reference.endColumnBounded ?? true;
  }

  isEndRowBounded(): boolean {
    return this.#reference.endRowBounded ?? true;
  }

  isStartColumnBounded(): boolean {
    return this.#reference.startColumnBounded ?? true;
  }

  isStartRowBounded(): boolean {
    return this.#reference.startRowBounded ?? true;
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

  randomize(): Range {
    const values = this.getValues();

    // Apps Script does not specify the randomization algorithm. Vegas uses an in-place
    // Fisher-Yates shuffle driven by the host JavaScript runtime's Math.random().
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [values[index], values[swapIndex]] = [values[swapIndex]!, values[index]!];
    }

    return this.#writeValues(values);
  }

  removeDuplicates(): Range;
  removeDuplicates(columnsToCompare: GoogleAppsScript.Integer[]): Range;
  removeDuplicates(columnsToCompare?: readonly GoogleAppsScript.Integer[]): Range {
    const columnOffsets =
      columnsToCompare === undefined || columnsToCompare.length === 0
        ? Array.from({ length: this.#reference.numColumns }, (_, offset) => offset)
        : columnsToCompare.map((column) => {
            assertInteger(column, "Spreadsheet range duplicate column");

            const offset = column - this.#reference.column;
            if (offset < 0 || offset >= this.#reference.numColumns) {
              throw new RangeError("Spreadsheet range duplicate column must be within the Range.");
            }

            return offset;
          });

    const values = this.getValues();
    const seen = new Set<string>();
    const uniqueRows = values.filter((row) => {
      const key = createDuplicateRowKey(row, columnOffsets);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

    if (uniqueRows.length === values.length) {
      return this;
    }

    const emptyRows = Array.from({ length: values.length - uniqueRows.length }, () =>
      Array.from({ length: this.#reference.numColumns }, () => ""),
    );

    this.#writeValues([...uniqueRows, ...emptyRows]);

    return this.#hydrator.hydrate({
      service: "spreadsheet",
      kind: "range",
      spreadsheetId: this.#reference.spreadsheetId,
      sheetId: this.#reference.sheetId,
      row: this.#reference.row,
      column: this.#reference.column,
      numRows: uniqueRows.length,
      numColumns: this.#reference.numColumns,
    });
  }

  setNote(note: string | null): Range {
    return this.setNotes(
      Array.from({ length: this.#reference.numRows }, () =>
        Array.from({ length: this.#reference.numColumns }, () => note),
      ),
    );
  }

  setNotes(notes: SpreadsheetNoteGrid): Range {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-range-notes",
      range: this.#reference,
      notes,
    });

    return this;
  }

  setValue(value: SpreadsheetCellValue): Range {
    const values = Array.from({ length: this.#reference.numRows }, () =>
      Array.from({ length: this.#reference.numColumns }, () => value),
    );
    assertFormulaValuesSupported(values, "Range.setValue() with formula values");

    return this.#writeValues(values);
  }

  setValues(values: SpreadsheetGrid): Range {
    assertFormulaValuesSupported(values, "Range.setValues() with formula values");

    return this.#writeValues(values);
  }

  trimWhitespace(): Range {
    // Apps Script explicitly keeps text beginning with "=" as text after trimming instead of
    // interpreting it as a formula, so this internal write bypasses public formula handling.
    return this.#writeValues(this.getValues().map((row) => row.map(trimCellWhitespace)));
  }

  #writeValues(values: SpreadsheetGrid): Range {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-range-values",
      range: this.#reference,
      values,
    });

    return this;
  }
}
