import type { SpreadsheetRowCodec } from "./spreadsheet-row-codec";

export interface SpreadsheetColumn<Row, Value> {
  readonly name: string;
  readonly index: number;
  getValue(row: Row): Value;
}

export type SpreadsheetSchemaColumnSource<Row> =
  | readonly SpreadsheetColumn<Row, unknown>[]
  | Readonly<Record<string, SpreadsheetColumn<Row, unknown>>>;

export interface SpreadsheetSchema<
  Row,
  Columns extends SpreadsheetSchemaColumnSource<Row> = readonly SpreadsheetColumn<Row, unknown>[],
> {
  readonly codec: SpreadsheetRowCodec<Row>;
  readonly columns: Columns;
  readonly columnList: readonly SpreadsheetColumn<Row, unknown>[];
  getColumn(name: string): SpreadsheetColumn<Row, unknown> | undefined;
}

function isSpreadsheetSchemaColumnArray<Row>(
  columns: SpreadsheetSchemaColumnSource<Row>,
): columns is readonly SpreadsheetColumn<Row, unknown>[] {
  return Array.isArray(columns);
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

export function createSpreadsheetSchema<Row>(
  codec: SpreadsheetRowCodec<Row>,
  columns: readonly SpreadsheetColumn<Row, unknown>[],
): SpreadsheetSchema<Row>;
export function createSpreadsheetSchema<
  Row,
  Columns extends Readonly<Record<string, SpreadsheetColumn<Row, unknown>>>,
>(codec: SpreadsheetRowCodec<Row>, columns: Columns): SpreadsheetSchema<Row, Columns>;
export function createSpreadsheetSchema<Row>(
  codec: SpreadsheetRowCodec<Row>,
  columns: SpreadsheetSchemaColumnSource<Row>,
): SpreadsheetSchema<Row, SpreadsheetSchemaColumnSource<Row>> {
  const resolvedColumns = isSpreadsheetSchemaColumnArray(columns) ? [...columns] : { ...columns };
  const columnList = isSpreadsheetSchemaColumnArray(resolvedColumns)
    ? resolvedColumns
    : Object.values(resolvedColumns);
  const names = new Set<string>();
  const indices = new Set<number>();

  for (const column of columnList) {
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
    columnList,
    getColumn(name): SpreadsheetColumn<Row, unknown> | undefined {
      return columnList.find((column) => column.name === name);
    },
  };
}
