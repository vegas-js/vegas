export type CreateRange = (
  spreadsheetId: string,
  sheetId: number,
  row: number,
  column: number,
  numRows: number,
  numColumns: number,
) => GoogleAppsScript.Spreadsheet.Range;

export type CreateHtmlOutput = (
  content: string,
  defaultXFrameOptionsMode: GoogleAppsScript.HTML.XFrameOptionsMode,
) => GoogleAppsScript.HTML.HtmlOutput;

export type CreateHtmlTemplate = (content: string) => GoogleAppsScript.HTML.HtmlTemplate;
