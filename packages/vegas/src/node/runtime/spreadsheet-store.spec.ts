import { describe, expectTypeOf, test } from "vitest";

import type {
  RangeReference,
  SheetDataBounds,
  SheetReference,
  SpreadsheetCellValue,
  SpreadsheetGrid,
  SpreadsheetMetadata,
  SpreadsheetReference,
  SpreadsheetStore,
} from "./index";

describe("SpreadsheetStore contract", () => {
  test("model the value types documented for Range values", () => {
    expectTypeOf<SpreadsheetCellValue>().toEqualTypeOf<string | number | boolean | Date>();
    expectTypeOf<SpreadsheetGrid>().toEqualTypeOf<readonly (readonly SpreadsheetCellValue[])[]>();
  });

  test("keep resource identity separate from mutable metadata and values", () => {
    expectTypeOf<
      SpreadsheetStore["getSpreadsheet"]
    >().returns.resolves.toEqualTypeOf<SpreadsheetReference>();
    expectTypeOf<
      SpreadsheetStore["getSpreadsheetMetadata"]
    >().returns.resolves.toEqualTypeOf<SpreadsheetMetadata>();
    expectTypeOf<SpreadsheetStore["renameSpreadsheet"]>().returns.resolves.toEqualTypeOf<void>();
    expectTypeOf<SpreadsheetStore["listSheets"]>().returns.resolves.toEqualTypeOf<
      readonly SheetReference[]
    >();
    expectTypeOf<
      SpreadsheetStore["getSheet"]
    >().returns.resolves.toEqualTypeOf<SheetReference | null>();
    expectTypeOf<
      SpreadsheetStore["getSheetByName"]
    >().returns.resolves.toEqualTypeOf<SheetReference | null>();
    expectTypeOf<
      SpreadsheetStore["getSheetDataBounds"]
    >().returns.resolves.toEqualTypeOf<SheetDataBounds>();
    expectTypeOf<SpreadsheetStore["getRangeValues"]>().parameter(0).toEqualTypeOf<RangeReference>();
    expectTypeOf<
      SpreadsheetStore["getRangeValues"]
    >().returns.resolves.toEqualTypeOf<SpreadsheetGrid>();
  });
});
