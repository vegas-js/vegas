import { describe, expectTypeOf, test } from "vitest";

import {
  Range,
  Sheet,
  Spreadsheet,
  type HydratedSpreadsheetObject,
  type RangeReference,
  type SheetReference,
  type SpreadsheetReference,
} from "./index";

describe("SpreadsheetObjectHydrator", () => {
  test("map each reference kind to its Runtime public object Class", () => {
    expectTypeOf<HydratedSpreadsheetObject<SpreadsheetReference>>().toEqualTypeOf<Spreadsheet>();
    expectTypeOf<HydratedSpreadsheetObject<SheetReference>>().toEqualTypeOf<Sheet>();
    expectTypeOf<HydratedSpreadsheetObject<RangeReference>>().toEqualTypeOf<Range>();
  });
});
