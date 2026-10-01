export interface SpreadsheetRowCodec<Row> {
  readonly width: number;
  decode(values: readonly unknown[]): Row;
  encode(row: Row): readonly unknown[];
}

function requireSpreadsheetRowWidth(width: number): number {
  if (!Number.isInteger(width) || width <= 0) {
    throw new RangeError("Spreadsheet row codec width must be a positive integer.");
  }

  return width;
}

function requireSpreadsheetRowValues(
  values: readonly unknown[],
  width: number,
  operation: "decode" | "encode",
): readonly unknown[] {
  if (values.length !== width) {
    throw new RangeError(
      `Spreadsheet row codec ${operation} expected ${width} values, received ${values.length}.`,
    );
  }

  return values;
}

export function createSpreadsheetRowCodec<Row>(
  width: number,
  decode: (values: readonly unknown[]) => Row,
  encode: (row: Row) => readonly unknown[],
): SpreadsheetRowCodec<Row> {
  const resolvedWidth = requireSpreadsheetRowWidth(width);

  return {
    width: resolvedWidth,
    decode(values): Row {
      return decode(requireSpreadsheetRowValues(values, resolvedWidth, "decode"));
    },
    encode(row): readonly unknown[] {
      return requireSpreadsheetRowValues([...encode(row)], resolvedWidth, "encode");
    },
  };
}
