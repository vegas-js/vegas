import { createRuntimeEnum } from "./runtime-enum";

export const SPREADSHEET_SHEET_TYPE = createRuntimeEnum("GRID", "OBJECT", "DATASOURCE");

export type SpreadsheetSheetType =
  (typeof SPREADSHEET_SHEET_TYPE)[keyof typeof SPREADSHEET_SHEET_TYPE];
