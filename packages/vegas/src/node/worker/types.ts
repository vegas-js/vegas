export type CreateSpreadsheet = (spreadsheetId: string) => GoogleAppsScript.Spreadsheet.Spreadsheet;

export type CreateFolder = () => GoogleAppsScript.Drive.Folder;

export type CreateFile = () => GoogleAppsScript.Drive.File;
