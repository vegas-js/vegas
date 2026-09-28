import type { SpreadsheetRowCodec } from "./spreadsheet-row-codec";

export interface SpreadsheetTableOptions {
  readonly startRow?: number;
  readonly startColumn?: number;
}

export interface SpreadsheetTable<Row> {
  readAll(): Row[];
  append(row: Row): void;
  updateAt(index: number, row: Row): void;
}

function requireTableCoordinate(value: number, name: "startRow" | "startColumn"): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`Spreadsheet table ${name} must be a positive integer.`);
  }

  return value;
}

function requireTableIndex(index: number): number {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError("Spreadsheet table row index must be a non-negative integer.");
  }

  return index;
}

export function createSpreadsheetTable<Row>(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  codec: SpreadsheetRowCodec<Row>,
  options: SpreadsheetTableOptions = {},
): SpreadsheetTable<Row> {
  const startRow = requireTableCoordinate(options.startRow ?? 1, "startRow");
  const startColumn = requireTableCoordinate(options.startColumn ?? 1, "startColumn");

  return {
    readAll(): Row[] {
      const lastRow = sheet.getLastRow();

      if (lastRow < startRow) {
        return [];
      }

      const rowCount = lastRow - startRow + 1;
      const values = sheet.getRange(startRow, startColumn, rowCount, codec.width).getValues();

      return values.map((row) => codec.decode(row));
    },

    append(row): void {
      const values = [...codec.encode(row)];
      const rowIndex = Math.max(sheet.getLastRow() + 1, startRow);

      sheet.getRange(rowIndex, startColumn, 1, codec.width).setValues([values]);
    },

    updateAt(index, row): void {
      const resolvedIndex = requireTableIndex(index);
      const rowIndex = startRow + resolvedIndex;

      if (rowIndex > sheet.getLastRow()) {
        throw new RangeError(`Spreadsheet table row index ${resolvedIndex} is out of range.`);
      }

      const values = [...codec.encode(row)];

      sheet.getRange(rowIndex, startColumn, 1, codec.width).setValues([values]);
    },
  };
}
