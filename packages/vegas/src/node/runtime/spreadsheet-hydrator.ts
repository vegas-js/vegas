import type { Range } from "./spreadsheet-range";
import type {
  RangeReference,
  SheetReference,
  SpreadsheetObjectReference,
  SpreadsheetReference,
} from "./spreadsheet-reference";
import type { Sheet } from "./spreadsheet-sheet";
import type { Spreadsheet } from "./spreadsheet-spreadsheet";

export type HydratedSpreadsheetObject<R extends SpreadsheetObjectReference> =
  R extends SpreadsheetReference
    ? Spreadsheet
    : R extends SheetReference
      ? Sheet
      : R extends RangeReference
        ? Range
        : never;

/**
 * Reconstructs Apps Script public Spreadsheet objects from plain host references.
 */
export interface SpreadsheetObjectHydrator {
  hydrate(reference: SpreadsheetReference): Spreadsheet;
  hydrate(reference: SheetReference): Sheet;
  hydrate(reference: RangeReference): Range;
}
