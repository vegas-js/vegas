import { createRuntimeEnum } from "./runtime-enum";

export const SPREADSHEET_DIRECTION = createRuntimeEnum("UP", "DOWN", "PREVIOUS", "NEXT");

export type SpreadsheetDirection =
  (typeof SPREADSHEET_DIRECTION)[keyof typeof SPREADSHEET_DIRECTION];

export const SPREADSHEET_DIMENSION = createRuntimeEnum("COLUMNS", "ROWS");

export type SpreadsheetDimension =
  (typeof SPREADSHEET_DIMENSION)[keyof typeof SPREADSHEET_DIMENSION];

export const SPREADSHEET_SHEET_TYPE = createRuntimeEnum("GRID", "OBJECT", "DATASOURCE");

export type SpreadsheetSheetType =
  (typeof SPREADSHEET_SHEET_TYPE)[keyof typeof SPREADSHEET_SHEET_TYPE];
