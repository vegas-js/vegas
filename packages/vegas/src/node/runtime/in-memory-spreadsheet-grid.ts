import type { RangeReference } from "./spreadsheet-reference";
import type { SheetDataBounds, SpreadsheetCellValue, SpreadsheetGrid } from "./spreadsheet-store";
import { assertPositiveInteger } from "./spreadsheet-validation";

type GridRange = Pick<RangeReference, "row" | "column" | "numRows" | "numColumns">;

function cloneCellValue(value: SpreadsheetCellValue): SpreadsheetCellValue {
  return value instanceof Date ? new Date(value.getTime()) : value;
}

function createCellKey(row: number, column: number): string {
  return `${row}:${column}`;
}

function shiftRowsDown<T>(entries: Map<string, T>, startRow: number, numRows: number): void {
  const shifted = new Map<string, T>();

  for (const [key, value] of entries) {
    const separator = key.indexOf(":");
    const row = Number(key.slice(0, separator));
    const column = Number(key.slice(separator + 1));
    const nextRow = row >= startRow ? row + numRows : row;

    shifted.set(createCellKey(nextRow, column), value);
  }

  entries.clear();
  for (const [key, value] of shifted) {
    entries.set(key, value);
  }
}

export class InMemorySpreadsheetGrid {
  #maxRows: number;
  readonly #maxColumns: number;
  readonly #cells = new Map<string, SpreadsheetCellValue>();
  readonly #notes = new Map<string, string>();

  constructor(maxRows: number, maxColumns: number, values: SpreadsheetGrid = []) {
    assertPositiveInteger(maxRows, "Spreadsheet sheet maxRows");
    assertPositiveInteger(maxColumns, "Spreadsheet sheet maxColumns");

    if (values.length > maxRows) {
      throw new RangeError("Spreadsheet seed values exceed sheet row bounds.");
    }

    const width = values[0]?.length ?? 0;
    if (width > maxColumns) {
      throw new RangeError("Spreadsheet seed values exceed sheet column bounds.");
    }

    for (const row of values) {
      if (row.length !== width) {
        throw new RangeError("Spreadsheet seed values must be rectangular.");
      }
    }

    this.#maxRows = maxRows;
    this.#maxColumns = maxColumns;

    values.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        if (value !== "") {
          this.#cells.set(createCellKey(rowIndex + 1, columnIndex + 1), cloneCellValue(value));
        }
      });
    });
  }

  clone(): InMemorySpreadsheetGrid {
    const clone = new InMemorySpreadsheetGrid(this.#maxRows, this.#maxColumns);

    for (const [key, value] of this.#cells) {
      clone.#cells.set(key, cloneCellValue(value));
    }

    for (const [key, note] of this.#notes) {
      clone.#notes.set(key, note);
    }

    return clone;
  }

  clearNotes(): void {
    this.#notes.clear();
  }

  getDataBounds(): SheetDataBounds {
    let lastRow: number | null = null;
    let lastColumn: number | null = null;

    for (const key of this.#cells.keys()) {
      const separator = key.indexOf(":");
      const row = Number(key.slice(0, separator));
      const column = Number(key.slice(separator + 1));

      lastRow = lastRow === null ? row : Math.max(lastRow, row);
      lastColumn = lastColumn === null ? column : Math.max(lastColumn, column);
    }

    return {
      lastRow,
      lastColumn,
    };
  }

  insertRows(startRow: number, numRows: number): void {
    assertPositiveInteger(startRow, "Spreadsheet grid row start");
    assertPositiveInteger(numRows, "Spreadsheet grid row count");

    if (startRow > this.#maxRows + 1) {
      throw new RangeError(
        `Spreadsheet grid row start must be between 1 and ${this.#maxRows + 1}.`,
      );
    }

    shiftRowsDown(this.#cells, startRow, numRows);
    shiftRowsDown(this.#notes, startRow, numRows);
    this.#maxRows += numRows;
  }

  getValues(range: GridRange): SpreadsheetGrid {
    this.#validateRange(range);

    return Array.from({ length: range.numRows }, (_, rowOffset) =>
      Array.from({ length: range.numColumns }, (_, columnOffset) => {
        const value = this.#cells.get(
          createCellKey(range.row + rowOffset, range.column + columnOffset),
        );
        return value === undefined ? "" : cloneCellValue(value);
      }),
    );
  }

  getNotes(range: GridRange): string[][] {
    this.#validateRange(range);

    return Array.from({ length: range.numRows }, (_, rowOffset) =>
      Array.from(
        { length: range.numColumns },
        (_, columnOffset) =>
          this.#notes.get(createCellKey(range.row + rowOffset, range.column + columnOffset)) ?? "",
      ),
    );
  }

  setValues(range: GridRange, values: SpreadsheetGrid): void {
    this.#validateRange(range);

    if (values.length !== range.numRows || values.some((row) => row.length !== range.numColumns)) {
      throw new RangeError("Spreadsheet values dimensions must match the target range.");
    }

    const copiedValues = values.map((row) => row.map(cloneCellValue));

    copiedValues.forEach((row, rowOffset) => {
      row.forEach((value, columnOffset) => {
        const key = createCellKey(range.row + rowOffset, range.column + columnOffset);

        if (value === "") {
          this.#cells.delete(key);
        } else {
          this.#cells.set(key, value);
        }
      });
    });
  }

  setNotes(range: GridRange, notes: readonly (readonly (string | null)[])[]): void {
    this.#validateRange(range);

    if (notes.length !== range.numRows || notes.some((row) => row.length !== range.numColumns)) {
      throw new RangeError("Spreadsheet note dimensions must match the target range.");
    }

    notes.forEach((row, rowOffset) => {
      row.forEach((note, columnOffset) => {
        const key = createCellKey(range.row + rowOffset, range.column + columnOffset);

        if (note === null) {
          this.#notes.delete(key);
        } else {
          this.#notes.set(key, note);
        }
      });
    });
  }

  #validateRange(range: GridRange): void {
    assertPositiveInteger(range.row, "Spreadsheet range row");
    assertPositiveInteger(range.column, "Spreadsheet range column");
    assertPositiveInteger(range.numRows, "Spreadsheet range numRows");
    assertPositiveInteger(range.numColumns, "Spreadsheet range numColumns");

    const lastRow = range.row + range.numRows - 1;
    const lastColumn = range.column + range.numColumns - 1;

    if (lastRow > this.#maxRows || lastColumn > this.#maxColumns) {
      throw new RangeError("Spreadsheet range is outside sheet bounds.");
    }
  }
}
