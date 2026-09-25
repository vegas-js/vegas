import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

interface SpreadsheetRangeBounds {
  readonly startRowBounded?: boolean;
  readonly endRowBounded?: boolean;
  readonly startColumnBounded?: boolean;
  readonly endColumnBounded?: boolean;
}

export interface SpreadsheetRangeCoordinates {
  readonly row: number;
  readonly column: number;
  readonly numRows: number;
  readonly numColumns: number;
}

const A1_CELL_RANGE = /^\$?([A-Z]+)\$?([1-9]\d*)(?::\$?([A-Z]+)\$?([1-9]\d*))?$/i;
const A1_COLUMN_RANGE = /^\$?([A-Z]+):\$?([A-Z]+)$/i;
const A1_ROW_RANGE = /^\$?([1-9]\d*):\$?([1-9]\d*)$/;
const R1C1_CELL_RANGE = /^R([1-9]\d*)C([1-9]\d*)(?::R([1-9]\d*)C([1-9]\d*))?$/i;

function parseColumnName(name: string): number {
  let column = 0;

  for (const character of name.toUpperCase()) {
    column = column * 26 + character.charCodeAt(0) - 64;
  }

  return column;
}

function createCoordinates(
  row: number,
  column: number,
  endRow = row,
  endColumn = column,
): SpreadsheetRangeCoordinates {
  if (endRow < row || endColumn < column) {
    throw new RangeError("Spreadsheet range notation must not reverse its bounds.");
  }

  return {
    row,
    column,
    numRows: endRow - row + 1,
    numColumns: endColumn - column + 1,
  };
}

function unsupportedNotation(notation: string): never {
  throw new UnsupportedRuntimeOperationError(
    "Sheet.getRange(a1Notation)",
    `notation is not modeled by the local Runtime: ${JSON.stringify(notation)}`,
  );
}

export function resolveSpreadsheetRangeBounds(notation: string): SpreadsheetRangeBounds {
  const value = notation.trim();

  if (A1_COLUMN_RANGE.test(value)) {
    return {
      startRowBounded: false,
      endRowBounded: false,
    };
  }

  if (A1_ROW_RANGE.test(value)) {
    return {
      startColumnBounded: false,
      endColumnBounded: false,
    };
  }

  return {};
}

// Apps Script documents both A1 and R1C1 notation. Vegas resolves A1 references first because
// strings such as C2:C4 and R2:R4 are valid A1 ranges as well as plausible R1C1 fragments.
// Unambiguous absolute R1C1 cell references are supported; other forms fail closed.
export function resolveSpreadsheetRangeNotation(
  notation: string,
  maxRows: number,
  maxColumns: number,
): SpreadsheetRangeCoordinates {
  const value = notation.trim();

  const a1Cell = A1_CELL_RANGE.exec(value);
  if (a1Cell !== null) {
    return createCoordinates(
      Number(a1Cell[2]!),
      parseColumnName(a1Cell[1]!),
      a1Cell[4] === undefined ? undefined : Number(a1Cell[4]),
      a1Cell[3] === undefined ? undefined : parseColumnName(a1Cell[3]),
    );
  }

  const a1Columns = A1_COLUMN_RANGE.exec(value);
  if (a1Columns !== null) {
    return createCoordinates(
      1,
      parseColumnName(a1Columns[1]!),
      maxRows,
      parseColumnName(a1Columns[2]!),
    );
  }

  const a1Rows = A1_ROW_RANGE.exec(value);
  if (a1Rows !== null) {
    return createCoordinates(Number(a1Rows[1]!), 1, Number(a1Rows[2]!), maxColumns);
  }

  const r1c1Cell = R1C1_CELL_RANGE.exec(value);
  if (r1c1Cell !== null) {
    return createCoordinates(
      Number(r1c1Cell[1]!),
      Number(r1c1Cell[2]!),
      r1c1Cell[3] === undefined ? undefined : Number(r1c1Cell[3]),
      r1c1Cell[4] === undefined ? undefined : Number(r1c1Cell[4]),
    );
  }

  return unsupportedNotation(notation);
}
