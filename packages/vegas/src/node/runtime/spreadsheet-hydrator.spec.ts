import { describe, expect, expectTypeOf, test } from "vitest";

import type { HostBridge } from "./host-bridge";
import type { HostCall, HostCallResult } from "./host-call";
import type { HydratedSpreadsheetObject } from "./spreadsheet-hydrator";
import { createSpreadsheetObjectHydrator } from "./spreadsheet-object-hydrator";
import { Range } from "./spreadsheet-range";
import type { RangeReference, SheetReference, SpreadsheetReference } from "./spreadsheet-reference";
import { Sheet } from "./spreadsheet-sheet";
import { Spreadsheet } from "./spreadsheet-spreadsheet";

class FailingHostBridge implements HostBridge {
  call<C extends HostCall>(call: C): HostCallResult<C> {
    throw new Error(`unexpected host call: ${call.service}#${call.operation}`);
  }
}

describe("SpreadsheetObjectHydrator", () => {
  test("map each reference kind to its Runtime public object Class", () => {
    expectTypeOf<HydratedSpreadsheetObject<SpreadsheetReference>>().toEqualTypeOf<Spreadsheet>();
    expectTypeOf<HydratedSpreadsheetObject<SheetReference>>().toEqualTypeOf<Sheet>();
    expectTypeOf<HydratedSpreadsheetObject<RangeReference>>().toEqualTypeOf<Range>();
  });

  test("hydrate each reference kind without crossing the HostBridge", () => {
    const hydrator = createSpreadsheetObjectHydrator(new FailingHostBridge());

    const spreadsheet = hydrator.hydrate({
      service: "spreadsheet",
      kind: "spreadsheet",
      id: "spreadsheet-a",
    });
    const sheet = hydrator.hydrate({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
    });
    const range = hydrator.hydrate({
      service: "spreadsheet",
      kind: "range",
      spreadsheetId: "spreadsheet-a",
      sheetId: 7,
      row: 2,
      column: 3,
      numRows: 4,
      numColumns: 5,
    });

    expect(spreadsheet).toBeInstanceOf(Spreadsheet);
    expect(spreadsheet.getId()).toBe("spreadsheet-a");

    expect(sheet).toBeInstanceOf(Sheet);
    expect(sheet.getSheetId()).toBe(7);

    expect(range).toBeInstanceOf(Range);
    expect(range.getRow()).toBe(2);
    expect(range.getColumn()).toBe(3);
    expect(range.getNumRows()).toBe(4);
    expect(range.getNumColumns()).toBe(5);
  });
});
