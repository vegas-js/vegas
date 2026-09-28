import type { SpreadsheetRowCodec } from "./spreadsheet-row-codec";

export interface SpreadsheetTableOptions {
  readonly startRow?: number;
  readonly startColumn?: number;
}

export interface SpreadsheetTable<Row> {
  readAll(): Row[];
}

function requireTableCoordinate(value: number, name: "startRow" | "startColumn"): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`Spreadsheet table ${name} must be a positive integer.`);
  }

  return value;
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
  };
}
