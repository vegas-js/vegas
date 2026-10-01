// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet
export interface SpreadsheetReference {
  readonly service: "spreadsheet";
  readonly kind: "spreadsheet";
  readonly id: string;
}

// https://developers.google.com/apps-script/reference/spreadsheet/sheet
export interface SheetReference {
  readonly service: "spreadsheet";
  readonly kind: "sheet";
  readonly spreadsheetId: string;
  readonly sheetId: number;
}

// https://developers.google.com/apps-script/reference/spreadsheet/range
export interface RangeReference {
  readonly service: "spreadsheet";
  readonly kind: "range";
  readonly spreadsheetId: string;
  readonly sheetId: number;
  readonly row: number;
  readonly column: number;
  readonly numRows: number;
  readonly numColumns: number;
  // Vegas stores notation boundedness separately from finite local grid coordinates so
  // full-row/full-column A1 Ranges can preserve the Apps Script boundedness contract.
  readonly startRowBounded?: boolean;
  readonly endRowBounded?: boolean;
  readonly startColumnBounded?: boolean;
  readonly endColumnBounded?: boolean;
}

export type SpreadsheetObjectReference = SpreadsheetReference | SheetReference | RangeReference;
