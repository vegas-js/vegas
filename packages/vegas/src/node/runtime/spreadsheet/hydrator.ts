import type { Range } from "./range";
import type {
  RangeReference,
  SheetReference,
  SpreadsheetObjectReference,
  SpreadsheetReference,
} from "./reference";
import type { Sheet } from "./sheet";
import type { Spreadsheet } from "./spreadsheet";

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
