import type { RangeReference, SheetReference, SpreadsheetReference } from "./spreadsheet-reference";

// https://developers.google.com/apps-script/reference/spreadsheet/range#getvalue
// https://developers.google.com/apps-script/reference/spreadsheet/range#getvalues
export type SpreadsheetCellValue = string | number | boolean | Date;

export type SpreadsheetGrid = readonly (readonly SpreadsheetCellValue[])[];

export interface SpreadsheetMetadata {
  readonly name: string;
}

export interface SheetMetadata {
  readonly name: string;
  readonly maxRows: number;
  readonly maxColumns: number;
  readonly frozenColumns: number;
  readonly frozenRows: number;
  readonly hidden: boolean;
  readonly hiddenGridlines: boolean;
  readonly rightToLeft: boolean;
}

export interface SheetDataBounds {
  readonly lastRow: number | null;
  readonly lastColumn: number | null;
}

/**
 * Persistent resource state for the local Spreadsheet service.
 *
 * References carry identity across the HostBridge. The store owns mutable
 * spreadsheet, sheet, and cell state independently from Google-facing objects.
 */
export interface SpreadsheetStore {
  createSpreadsheet(name: string, rows: number, columns: number): Promise<SpreadsheetReference>;

  getSpreadsheet(id: string): Promise<SpreadsheetReference>;

  getSpreadsheetMetadata(spreadsheet: SpreadsheetReference): Promise<SpreadsheetMetadata>;

  renameSpreadsheet(spreadsheet: SpreadsheetReference, name: string): Promise<void>;

  listSheets(spreadsheet: SpreadsheetReference): Promise<readonly SheetReference[]>;

  getSheet(spreadsheet: SpreadsheetReference, sheetId: number): Promise<SheetReference | null>;

  getSheetByName(spreadsheet: SpreadsheetReference, name: string): Promise<SheetReference | null>;

  getSheetMetadata(sheet: SheetReference): Promise<SheetMetadata>;

  renameSheet(sheet: SheetReference, name: string): Promise<void>;

  setSheetFrozenColumns(sheet: SheetReference, columns: number): Promise<void>;

  setSheetFrozenRows(sheet: SheetReference, rows: number): Promise<void>;

  setSheetHidden(sheet: SheetReference, hidden: boolean): Promise<void>;

  setSheetHiddenGridlines(sheet: SheetReference, hidden: boolean): Promise<void>;

  setSheetRightToLeft(sheet: SheetReference, rightToLeft: boolean): Promise<void>;

  getSheetDataBounds(sheet: SheetReference): Promise<SheetDataBounds>;

  getRangeValues(range: RangeReference): Promise<SpreadsheetGrid>;

  setRangeValues(range: RangeReference, values: SpreadsheetGrid): Promise<void>;
}
