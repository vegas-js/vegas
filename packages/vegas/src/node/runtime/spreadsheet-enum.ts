import { createRuntimeEnum } from "./runtime-enum";

export const SPREADSHEET_BORDER_STYLE = createRuntimeEnum(
  "DOTTED",
  "DASHED",
  "SOLID",
  "SOLID_MEDIUM",
  "SOLID_THICK",
  "DOUBLE",
);

export type SpreadsheetBorderStyle =
  (typeof SPREADSHEET_BORDER_STYLE)[keyof typeof SPREADSHEET_BORDER_STYLE];

export const SPREADSHEET_DIRECTION = createRuntimeEnum("UP", "DOWN", "PREVIOUS", "NEXT");

export type SpreadsheetDirection =
  (typeof SPREADSHEET_DIRECTION)[keyof typeof SPREADSHEET_DIRECTION];

export const SPREADSHEET_DIMENSION = createRuntimeEnum("COLUMNS", "ROWS");

export type SpreadsheetDimension =
  (typeof SPREADSHEET_DIMENSION)[keyof typeof SPREADSHEET_DIMENSION];

export const SPREADSHEET_SHEET_TYPE = createRuntimeEnum("GRID", "OBJECT", "DATASOURCE");

export type SpreadsheetSheetType =
  (typeof SPREADSHEET_SHEET_TYPE)[keyof typeof SPREADSHEET_SHEET_TYPE];

export const SPREADSHEET_TEXT_DIRECTION = createRuntimeEnum("LEFT_TO_RIGHT", "RIGHT_TO_LEFT");

export type SpreadsheetTextDirection =
  (typeof SPREADSHEET_TEXT_DIRECTION)[keyof typeof SPREADSHEET_TEXT_DIRECTION];

export const SPREADSHEET_WRAP_STRATEGY = createRuntimeEnum("WRAP", "OVERFLOW", "CLIP");

export type SpreadsheetWrapStrategy =
  (typeof SPREADSHEET_WRAP_STRATEGY)[keyof typeof SPREADSHEET_WRAP_STRATEGY];
