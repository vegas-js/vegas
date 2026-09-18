export enum RuntimeDataTarget {
  Cache = "Cache",
  Properties = "Properties",
  Session = "Session",
  Spreadsheet = "Spreadsheet",
  // TODO
}

export interface RuntimeDataProperties {
  documentProperties?: Record<string, string>;
  scriptProperties?: Record<string, string>;
  userProperties?: Record<string, string>;
}

export interface RuntimeDataSession {
  activeUserEmail?: string;
  activeUserLocale?: string;
  effectiveUserEmail?: string;
  temporaryActiveUserKey?: string;
}

export type RuntimeDataSpreadsheetCellValue = string | number | boolean | Date;

export interface RuntimeDataSpreadsheetSheet {
  readonly id: number;
  readonly name: string;
  readonly maxRows: number;
  readonly maxColumns: number;
  readonly values?: readonly (readonly RuntimeDataSpreadsheetCellValue[])[];
}

export interface RuntimeDataSpreadsheet {
  readonly id: string;
  readonly name: string;
  readonly sheets: readonly RuntimeDataSpreadsheetSheet[];
}
