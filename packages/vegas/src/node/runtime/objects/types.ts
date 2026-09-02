export type CreateRange = (
  spreadsheetId: string,
  sheetId: number,
  row: number,
  column: number,
  numRows: number,
  numColumns: number,
) => GoogleAppsScript.Spreadsheet.Range;

export type CreateSheet = (
  spreadsheetId: string,
  sheetId: number,
) => GoogleAppsScript.Spreadsheet.Sheet;

export type CreateSpreadsheet = (spreadsheetId: string) => GoogleAppsScript.Spreadsheet.Spreadsheet;

export type CreateFolder = () => GoogleAppsScript.Drive.Folder;

export type CreateFile = () => GoogleAppsScript.Drive.File;

export type CreateHtmlOutput = (
  content: string,
  defaultXFrameOptionsMode: GoogleAppsScript.HTML.XFrameOptionsMode,
) => GoogleAppsScript.HTML.HtmlOutput;

export type CreateHtmlTemplate = (content: string) => GoogleAppsScript.HTML.HtmlTemplate;
