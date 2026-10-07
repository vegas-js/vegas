import type { SpreadsheetRowCodec } from "./row-codec";

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

function requireSpreadsheetRowCodecWidth(width: number): number {
  if (!Number.isInteger(width) || width <= 0) {
    throw new RangeError("Spreadsheet row codec width must be a positive integer.");
  }

  return width;
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
  const width = requireSpreadsheetRowCodecWidth(codec.width);
  const resolvedColumns = isSpreadsheetSchemaColumnArray(columns) ? [...columns] : { ...columns };
  const columnList = isSpreadsheetSchemaColumnArray(resolvedColumns)
    ? resolvedColumns
    : Object.values(resolvedColumns);
  const names = new Set<string>();
  const indices = new Set<number>();

  for (const column of columnList) {
    const name = requireSpreadsheetColumnName(column.name);
    const index = requireSpreadsheetColumnIndex(column.index);

    if (index >= width) {
      throw new RangeError(
        `Spreadsheet column "${name}" index ${index} exceeds row codec width ${width}.`,
      );
    }

    if (names.has(name)) {
      throw new RangeError(`Spreadsheet column name "${name}" must be unique.`);
    }

    if (indices.has(index)) {
      throw new RangeError(`Spreadsheet column index ${index} must be unique.`);
    }

    names.add(name);
    indices.add(index);
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
