import type { RangeReference, SheetReference, SpreadsheetReference } from "./spreadsheet-reference";

// https://developers.google.com/apps-script/reference/spreadsheet/range#getvalue
// https://developers.google.com/apps-script/reference/spreadsheet/range#getvalues
export type SpreadsheetCellValue = string | number | boolean | Date;

export type SpreadsheetGrid = readonly (readonly SpreadsheetCellValue[])[];

export type SpreadsheetNoteGrid = readonly (readonly (string | null)[])[];

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
  readonly tabColor: string | null;
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

  getSpreadsheetByUrl(url: string): Promise<SpreadsheetReference>;

  getSpreadsheetMetadata(spreadsheet: SpreadsheetReference): Promise<SpreadsheetMetadata>;

  getSpreadsheetLocale(spreadsheet: SpreadsheetReference): Promise<string>;

  getSpreadsheetTimeZone(spreadsheet: SpreadsheetReference): Promise<string>;

  renameSpreadsheet(spreadsheet: SpreadsheetReference, name: string): Promise<void>;

  setSpreadsheetLocale(spreadsheet: SpreadsheetReference, locale: string): Promise<void>;

  setSpreadsheetTimeZone(spreadsheet: SpreadsheetReference, timeZone: string): Promise<void>;

  listSheets(spreadsheet: SpreadsheetReference): Promise<readonly SheetReference[]>;

  deleteSheet(sheet: SheetReference): Promise<void>;

  getSheet(spreadsheet: SpreadsheetReference, sheetId: number): Promise<SheetReference | null>;

  getSheetByName(spreadsheet: SpreadsheetReference, name: string): Promise<SheetReference | null>;

  getSheetMetadata(sheet: SheetReference): Promise<SheetMetadata>;

  insertSheetColumns(sheet: SheetReference, startColumn: number, numColumns: number): Promise<void>;

  insertSheetRows(sheet: SheetReference, startRow: number, numRows: number): Promise<void>;

  isSheetColumnHiddenByUser(sheet: SheetReference, column: number): Promise<boolean>;

  isSheetRowHiddenByUser(sheet: SheetReference, row: number): Promise<boolean>;

  renameSheet(sheet: SheetReference, name: string): Promise<void>;

  setSheetColumnsHidden(
    sheet: SheetReference,
    startColumn: number,
    numColumns: number,
    hidden: boolean,
  ): Promise<void>;

  setSheetRowsHidden(
    sheet: SheetReference,
    startRow: number,
    numRows: number,
    hidden: boolean,
  ): Promise<void>;

  setSheetFrozenColumns(sheet: SheetReference, columns: number): Promise<void>;

  setSheetFrozenRows(sheet: SheetReference, rows: number): Promise<void>;

  setSheetHidden(sheet: SheetReference, hidden: boolean): Promise<void>;

  setSheetHiddenGridlines(sheet: SheetReference, hidden: boolean): Promise<void>;

  setSheetRightToLeft(sheet: SheetReference, rightToLeft: boolean): Promise<void>;

  setSheetTabColor(sheet: SheetReference, tabColor: string | null): Promise<void>;

  clearSheetNotes(sheet: SheetReference): Promise<void>;

  getSheetDataBounds(sheet: SheetReference): Promise<SheetDataBounds>;

  getRangeNotes(range: RangeReference): Promise<SpreadsheetNoteGrid>;

  getRangeValues(range: RangeReference): Promise<SpreadsheetGrid>;

  setRangeNotes(range: RangeReference, notes: SpreadsheetNoteGrid): Promise<void>;

  setRangeValues(range: RangeReference, values: SpreadsheetGrid): Promise<void>;
}
