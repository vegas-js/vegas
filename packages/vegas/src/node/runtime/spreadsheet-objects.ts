import type { HostBridge } from "./host-bridge";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import type { RangeReference, SheetReference, SpreadsheetReference } from "./spreadsheet-reference";
import type { SpreadsheetCellValue, SpreadsheetGrid } from "./spreadsheet-store";

function cloneCellValue(value: SpreadsheetCellValue): SpreadsheetCellValue {
  return value instanceof Date ? new Date(value.getTime()) : value;
}

function cloneGrid(values: SpreadsheetGrid): SpreadsheetCellValue[][] {
  return values.map((row) => row.map(cloneCellValue));
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer.`);
  }
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${label} must be an integer.`);
  }
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

// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app
export class SpreadsheetApp {
  readonly #bridge: HostBridge;
  readonly #hydrator: SpreadsheetObjectHydrator;

  constructor(bridge: HostBridge, hydrator: SpreadsheetObjectHydrator) {
    this.#bridge = bridge;
    this.#hydrator = hydrator;
  }

  create(name: string, rows: number, columns: number): Spreadsheet {
    assertPositiveInteger(rows, "Spreadsheet rows");
    assertPositiveInteger(columns, "Spreadsheet columns");

    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "spreadsheet",
        operation: "create-spreadsheet",
        name,
        rows,
        columns,
      }),
    );
  }

  openById(id: string): Spreadsheet {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "spreadsheet",
        operation: "get-spreadsheet",
        id,
      }),
    );
  }
}

// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet
export class Spreadsheet {
  readonly #bridge: HostBridge;
  readonly #reference: SpreadsheetReference;
  readonly #hydrator: SpreadsheetObjectHydrator;

  constructor(
    bridge: HostBridge,
    reference: SpreadsheetReference,
    hydrator: SpreadsheetObjectHydrator,
  ) {
    this.#bridge = bridge;
    this.#reference = reference;
    this.#hydrator = hydrator;
  }

  getId(): string {
    return this.#reference.id;
  }

  getName(): string {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "get-spreadsheet-metadata",
      spreadsheet: this.#reference,
    }).name;
  }

  getSheets(): Sheet[] {
    return this.#bridge
      .call({
        service: "spreadsheet",
        operation: "list-sheets",
        spreadsheet: this.#reference,
      })
      .map((reference) => this.#hydrator.hydrate(reference));
  }

  getSheetByName(name: string): Sheet | null {
    const reference = this.#bridge.call({
      service: "spreadsheet",
      operation: "get-sheet-by-name",
      spreadsheet: this.#reference,
      name,
    });

    return reference === null ? null : this.#hydrator.hydrate(reference);
  }
}

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

  getMaxColumns(): number {
    return this.#metadata().maxColumns;
  }

  getMaxRows(): number {
    return this.#metadata().maxRows;
  }

  getName(): string {
    return this.#metadata().name;
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

  #metadata() {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "get-sheet-metadata",
      sheet: this.#reference,
    });
  }
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

  getColumn(): number {
    return this.#reference.column;
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
