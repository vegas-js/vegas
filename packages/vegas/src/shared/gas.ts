export enum RuntimeDataTarget {
  Cache = "Cache",
  Properties = "Properties",
  Session = "Session",
  Spreadsheet = "Spreadsheet",
  // TODO
}

export interface RuntimeDataProperties {
  readonly documentProperties?: Readonly<Record<string, string>>;
  readonly scriptProperties?: Readonly<Record<string, string>>;
  readonly userProperties?: Readonly<Record<string, string>>;
}

export interface RuntimeDataSession {
  readonly activeUserEmail?: string;
  readonly activeUserLocale?: string;
  readonly effectiveUserEmail?: string;
  readonly temporaryActiveUserKey?: string;
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
  readonly url?: string;
  readonly name: string;
  readonly sheets: readonly RuntimeDataSpreadsheetSheet[];
}

export interface RuntimeDataEntry<T> {
  readonly source: string;
  readonly value: T;
}

export interface RuntimeDataSnapshot {
  readonly properties?: RuntimeDataEntry<RuntimeDataProperties>;
  readonly session?: RuntimeDataEntry<RuntimeDataSession>;
  readonly spreadsheets: readonly RuntimeDataEntry<RuntimeDataSpreadsheet>[];
}
