// Apps Script documents integer counts and zero-to-unfreeze semantics, but not invalid-count

import { assertInteger, assertPositiveInteger } from "./validation";

// behavior. Vegas constrains local frozen counts to the current Sheet grid bounds.
export function assertFrozenCount(value: number, maximum: number, label: string): void {
  assertInteger(value, label);

  if (value < 0 || value > maximum) {
    throw new RangeError(`${label} must be between 0 and ${maximum}.`);
  }
}

// Apps Script documents 1-based column positions, but not invalid-span behavior.
// Vegas constrains local column visibility spans to the current Sheet grid.
export function assertColumnSpan(startColumn: number, numColumns: number, maximum: number): void {
  assertPositiveInteger(startColumn, "Spreadsheet sheet column start");
  assertPositiveInteger(numColumns, "Spreadsheet sheet column count");

  if (startColumn + numColumns - 1 > maximum) {
    throw new RangeError(`Spreadsheet sheet columns must stay within 1 and ${maximum}.`);
  }
}

export function assertColumnDeletion(
  startColumn: number,
  numColumns: number,
  maximum: number,
): void {
  assertColumnSpan(startColumn, numColumns, maximum);

  // Apps Script does not document deleting every column. Vegas preserves the local grid
  // invariant that a Sheet always has at least one column.
  if (numColumns >= maximum) {
    throw new RangeError("Spreadsheet sheet must retain at least one column.");
  }
}

// Apps Script documents 1-based insertion positions but not out-of-bounds behavior. Vegas
// accepts maxColumns + 1 as an append position and rejects positions that would leave a gap.
export function assertColumnInsertion(
  startColumn: number,
  numColumns: number,
  maximum: number,
): void {
  assertPositiveInteger(startColumn, "Spreadsheet sheet column start");
  assertPositiveInteger(numColumns, "Spreadsheet sheet column count");

  if (startColumn > maximum + 1) {
    throw new RangeError(
      `Spreadsheet sheet column insertion must start between 1 and ${maximum + 1}.`,
    );
  }
}

// Apps Script documents 1-based row positions, but not invalid-span behavior.
// Vegas constrains local row visibility spans to the current Sheet grid.
export function assertRowSpan(startRow: number, numRows: number, maximum: number): void {
  assertPositiveInteger(startRow, "Spreadsheet sheet row start");
  assertPositiveInteger(numRows, "Spreadsheet sheet row count");

  if (startRow + numRows - 1 > maximum) {
    throw new RangeError(`Spreadsheet sheet rows must stay within 1 and ${maximum}.`);
  }
}

export function assertRowDeletion(startRow: number, numRows: number, maximum: number): void {
  assertRowSpan(startRow, numRows, maximum);

  // Apps Script does not document deleting every row. Vegas preserves the local grid
  // invariant that a Sheet always has at least one row.
  if (numRows >= maximum) {
    throw new RangeError("Spreadsheet sheet must retain at least one row.");
  }
}

// Apps Script documents 1-based insertion positions but not out-of-bounds behavior. Vegas
// accepts maxRows + 1 as an append position and rejects positions that would leave a gap.
export function assertRowInsertion(startRow: number, numRows: number, maximum: number): void {
  assertPositiveInteger(startRow, "Spreadsheet sheet row start");
  assertPositiveInteger(numRows, "Spreadsheet sheet row count");

  if (startRow > maximum + 1) {
    throw new RangeError(
      `Spreadsheet sheet row insertion must start between 1 and ${maximum + 1}.`,
    );
  }
}
