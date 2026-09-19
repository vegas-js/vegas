import { describe, expect, expectTypeOf, test } from "vitest";

import type {
  HostCallResult,
  SheetDataBounds,
  SheetMetadata,
  SheetReference,
  SpreadsheetGrid,
  SpreadsheetHostCallResult,
  SpreadsheetMetadata,
  SpreadsheetReference,
} from "./index";

describe("Spreadsheet host contract", () => {
  test("keep Range values structured-clone safe", () => {
    const call = {
      service: "spreadsheet",
      operation: "set-range-values",
      range: {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-id",
        sheetId: 42,
        row: 1,
        column: 1,
        numRows: 1,
        numColumns: 4,
      },
      values: [["Vegas", 42, true, new Date("2026-09-18T00:00:00.000Z")]],
    } as const;

    const cloned = structuredClone(call);

    expect(cloned).toStrictEqual(call);
    expect(cloned.values[0]?.[3]).toBeInstanceOf(Date);
  });

  test("map resource and value operations to their result types", () => {
    const getSpreadsheet = {
      service: "spreadsheet",
      operation: "get-spreadsheet",
      id: "spreadsheet-id",
    } as const;
    const getMetadata = {
      service: "spreadsheet",
      operation: "get-spreadsheet-metadata",
      spreadsheet: {
        service: "spreadsheet",
        kind: "spreadsheet",
        id: "spreadsheet-id",
      },
    } as const;
    const renameSpreadsheet = {
      service: "spreadsheet",
      operation: "rename-spreadsheet",
      spreadsheet: getMetadata.spreadsheet,
      name: "Forecast",
    } as const;
    const listSheets = {
      service: "spreadsheet",
      operation: "list-sheets",
      spreadsheet: getMetadata.spreadsheet,
    } as const;
    const getSheet = {
      service: "spreadsheet",
      operation: "get-sheet",
      spreadsheet: getMetadata.spreadsheet,
      sheetId: 42,
    } as const;
    const getSheetByName = {
      service: "spreadsheet",
      operation: "get-sheet-by-name",
      spreadsheet: getMetadata.spreadsheet,
      name: "Summary",
    } as const;
    const getSheetMetadata = {
      service: "spreadsheet",
      operation: "get-sheet-metadata",
      sheet: {
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-id",
        sheetId: 42,
      },
    } as const;
    const getSheetDataBounds = {
      service: "spreadsheet",
      operation: "get-sheet-data-bounds",
      sheet: getSheetMetadata.sheet,
    } as const;
    const getRangeValues = {
      service: "spreadsheet",
      operation: "get-range-values",
      range: {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-id",
        sheetId: 42,
        row: 1,
        column: 1,
        numRows: 2,
        numColumns: 3,
      },
    } as const;
    const setRangeValues = {
      ...getRangeValues,
      operation: "set-range-values",
      values: [
        ["A", 1, true],
        ["B", 2, false],
      ],
    } as const;

    expectTypeOf<
      SpreadsheetHostCallResult<typeof getSpreadsheet>
    >().toEqualTypeOf<SpreadsheetReference>();
    expectTypeOf<
      SpreadsheetHostCallResult<typeof getMetadata>
    >().toEqualTypeOf<SpreadsheetMetadata>();
    expectTypeOf<SpreadsheetHostCallResult<typeof renameSpreadsheet>>().toEqualTypeOf<void>();
    expectTypeOf<SpreadsheetHostCallResult<typeof listSheets>>().toEqualTypeOf<
      readonly SheetReference[]
    >();
    expectTypeOf<
      SpreadsheetHostCallResult<typeof getSheet>
    >().toEqualTypeOf<SheetReference | null>();
    expectTypeOf<
      SpreadsheetHostCallResult<typeof getSheetByName>
    >().toEqualTypeOf<SheetReference | null>();
    expectTypeOf<
      SpreadsheetHostCallResult<typeof getSheetMetadata>
    >().toEqualTypeOf<SheetMetadata>();
    expectTypeOf<
      SpreadsheetHostCallResult<typeof getSheetDataBounds>
    >().toEqualTypeOf<SheetDataBounds>();
    expectTypeOf<
      SpreadsheetHostCallResult<typeof getRangeValues>
    >().toEqualTypeOf<SpreadsheetGrid>();
    expectTypeOf<SpreadsheetHostCallResult<typeof setRangeValues>>().toEqualTypeOf<void>();
    expectTypeOf<HostCallResult<typeof getRangeValues>>().toEqualTypeOf<SpreadsheetGrid>();
  });
});
