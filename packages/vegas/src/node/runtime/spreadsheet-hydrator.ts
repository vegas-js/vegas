import type { Range, Sheet, Spreadsheet } from "./spreadsheet-objects";
import type {
  RangeReference,
  SheetReference,
  SpreadsheetObjectReference,
  SpreadsheetReference,
} from "./spreadsheet-reference";

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
