import type { SpreadsheetRowCodec } from "./spreadsheet-row-codec";

export interface SpreadsheetColumn<Row, Value> {
  readonly name: string;
  readonly index: number;
  getValue(row: Row): Value;
}

export interface SpreadsheetSchema<Row> {
  readonly codec: SpreadsheetRowCodec<Row>;
  readonly columns: readonly SpreadsheetColumn<Row, unknown>[];
  getColumn(name: string): SpreadsheetColumn<Row, unknown> | undefined;
}

function requireSpreadsheetColumnName(name: string): string {
  if (name.length === 0) {
    throw new RangeError("Spreadsheet column name must not be empty.");
  }

  return name;
}

function requireSpreadsheetColumnIndex(index: number): number {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError("Spreadsheet column index must be a non-negative integer.");
  }

  return index;
}

export function createSpreadsheetColumn<Row, Value>(
  name: string,
  index: number,
  getValue: (row: Row) => Value,
): SpreadsheetColumn<Row, Value> {
  return {
    name: requireSpreadsheetColumnName(name),
    index: requireSpreadsheetColumnIndex(index),
    getValue,
  };
}

type SpreadsheetSchemaColumnSource<Row> =
  | readonly SpreadsheetColumn<Row, unknown>[]
  | Readonly<Record<string, SpreadsheetColumn<Row, unknown>>>;

function resolveSpreadsheetSchemaColumns<Row>(
  columns: SpreadsheetSchemaColumnSource<Row>,
): readonly SpreadsheetColumn<Row, unknown>[] {
  return Array.isArray(columns) ? [...columns] : Object.values(columns);
}

export function createSpreadsheetSchema<Row>(
  codec: SpreadsheetRowCodec<Row>,
  columns: SpreadsheetSchemaColumnSource<Row>,
): SpreadsheetSchema<Row> {
  const resolvedColumns = resolveSpreadsheetSchemaColumns(columns);
  const names = new Set<string>();
  const indices = new Set<number>();

  for (const column of resolvedColumns) {
    if (column.index >= codec.width) {
      throw new RangeError(
        `Spreadsheet column "${column.name}" index ${column.index} exceeds row codec width ${codec.width}.`,
      );
    }

    if (names.has(column.name)) {
      throw new RangeError(`Spreadsheet column name "${column.name}" must be unique.`);
    }

    if (indices.has(column.index)) {
      throw new RangeError(`Spreadsheet column index ${column.index} must be unique.`);
    }

    names.add(column.name);
    indices.add(column.index);
  }

  return {
    codec,
    columns: resolvedColumns,
    getColumn(name): SpreadsheetColumn<Row, unknown> | undefined {
      return resolvedColumns.find((column) => column.name === name);
    },
  };
}
