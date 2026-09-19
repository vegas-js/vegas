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

  listSheets(spreadsheet: SpreadsheetReference): Promise<readonly SheetReference[]>;

  getSheet(spreadsheet: SpreadsheetReference, sheetId: number): Promise<SheetReference | null>;

  getSheetByName(spreadsheet: SpreadsheetReference, name: string): Promise<SheetReference | null>;

  getSheetMetadata(sheet: SheetReference): Promise<SheetMetadata>;

  getRangeValues(range: RangeReference): Promise<SpreadsheetGrid>;

  setRangeValues(range: RangeReference, values: SpreadsheetGrid): Promise<void>;
}
