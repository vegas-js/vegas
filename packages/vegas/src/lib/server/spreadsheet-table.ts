import { matchesSpreadsheetQuery } from "./spreadsheet-query-executor";
import type { SpreadsheetQueryExpression } from "./spreadsheet-query-ir";
import type { SpreadsheetRowCodec } from "./spreadsheet-row-codec";
import type { SpreadsheetStorageCodec } from "./spreadsheet-storage-codec";

export interface SpreadsheetTableOptions {
  readonly startRow?: number;
  readonly startColumn?: number;
  readonly storageCodec?: SpreadsheetStorageCodec;
}

export interface SpreadsheetTable<Row> {
  readAll(): Row[];
  query(expression: SpreadsheetQueryExpression): Row[];
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

function createDefaultStorageCodec(width: number): SpreadsheetStorageCodec {
  return {
    logicalWidth: width,
    physicalWidth: width,
    encode(values): readonly unknown[] {
      return [...values];
    },
    decode(values): readonly unknown[] {
      return [...values];
    },
  };
}

function requireStorageCodecWidth(
  storageCodec: SpreadsheetStorageCodec,
  logicalWidth: number,
): SpreadsheetStorageCodec {
  if (storageCodec.logicalWidth !== logicalWidth) {
    throw new RangeError(
      `Spreadsheet table storage codec logical width ${storageCodec.logicalWidth} must match row codec width ${logicalWidth}.`,
    );
  }

  return storageCodec;
}

export function createSpreadsheetTable<Row>(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  codec: SpreadsheetRowCodec<Row>,
  options: SpreadsheetTableOptions = {},
): SpreadsheetTable<Row> {
  const startRow = requireTableCoordinate(options.startRow ?? 1, "startRow");
  const startColumn = requireTableCoordinate(options.startColumn ?? 1, "startColumn");
  const storageCodec = requireStorageCodecWidth(
    options.storageCodec ?? createDefaultStorageCodec(codec.width),
    codec.width,
  );

  function readValues(): unknown[][] {
    const lastRow = sheet.getLastRow();

    if (lastRow < startRow) {
      return [];
    }

    const rowCount = lastRow - startRow + 1;
    return sheet
      .getRange(startRow, startColumn, rowCount, storageCodec.physicalWidth)
      .getValues()
      .map((row) => [...storageCodec.decode(row)]);
  }

  return {
    readAll(): Row[] {
      return readValues().map((row) => codec.decode(row));
    },

    query(expression): Row[] {
      return readValues()
        .filter((row) => matchesSpreadsheetQuery(row, expression))
        .map((row) => codec.decode(row));
    },

    append(row): void {
      const values = [...storageCodec.encode(codec.encode(row))];
      const rowIndex = Math.max(sheet.getLastRow() + 1, startRow);

      sheet.getRange(rowIndex, startColumn, 1, storageCodec.physicalWidth).setValues([values]);
    },

    updateAt(index, row): void {
      const resolvedIndex = requireTableIndex(index);
      const rowIndex = startRow + resolvedIndex;

      if (rowIndex > sheet.getLastRow()) {
        throw new RangeError(`Spreadsheet table row index ${resolvedIndex} is out of range.`);
      }

      const values = [...storageCodec.encode(codec.encode(row))];

      sheet.getRange(rowIndex, startColumn, 1, storageCodec.physicalWidth).setValues([values]);
    },
  };
}
