import { CreateSheet, RequestSync } from "../..";

// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet
export class Spreadsheet implements GoogleAppsScript.Spreadsheet.Spreadsheet {
  #spreadsheetId: string;
  #createSheet: CreateSheet;
  #requestSync: RequestSync;

  constructor(spreadsheetId: string, createSheet: CreateSheet, requestSync: RequestSync) {
    this.#spreadsheetId = spreadsheetId;
    this.#createSheet = createSheet;
    this.#requestSync = requestSync;
  }

  addDeveloperMetadata = (key: unknown, value?: unknown, visibility?: unknown) => {
    throw new Error("Method not implemented.");
  };
  addEditor = (user: unknown) => {
    throw new Error("Method not implemented.");
  };
  addEditors = (emailAddresses: string[]) => {
    throw new Error("Method not implemented.");
  };
  addMenu = (name: string, subMenus: Array<{ name: string; functionName: string } | null>) => {
    throw new Error("Method not implemented.");
  };
  addViewer = (user: unknown) => {
    throw new Error("Method not implemented.");
  };
  addViewers = (emailAddresses: string[]) => {
    throw new Error("Method not implemented.");
  };
  appendRow = (rowContents: any[]) => {
    throw new Error("Method not implemented.");
  };
  autoResizeColumn = (columnPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  copy = (name: string) => {
    throw new Error("Method not implemented.");
  };
  createDeveloperMetadataFinder = () => {
    throw new Error("Method not implemented.");
  };
  createTextFinder = (findText: string) => {
    throw new Error("Method not implemented.");
  };
  deleteActiveSheet = () => {
    throw new Error("Method not implemented.");
  };
  deleteColumn = (columnPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  deleteColumns = (columnPosition: GoogleAppsScript.Integer, howMany: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  deleteRow = (rowPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  deleteRows = (rowPosition: GoogleAppsScript.Integer, howMany: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  deleteSheet = (sheet: GoogleAppsScript.Spreadsheet.Sheet) => {
    throw new Error("Method not implemented.");
  };
  duplicateActiveSheet = () => {
    throw new Error("Method not implemented.");
  };
  getActiveCell = () => {
    throw new Error("Method not implemented.");
  };
  getActiveRange = () => {
    throw new Error("Method not implemented.");
  };
  getActiveRangeList = () => {
    throw new Error("Method not implemented.");
  };
  getActiveSheet = () => {
    throw new Error("Method not implemented.");
  };
  getAs = (contentType: string) => {
    throw new Error("Method not implemented.");
  };
  getBandings = () => {
    throw new Error("Method not implemented.");
  };
  getBlob = () => {
    throw new Error("Method not implemented.");
  };
  getColumnWidth = (columnPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  getCurrentCell = () => {
    throw new Error("Method not implemented.");
  };
  getDataRange = () => {
    throw new Error("Method not implemented.");
  };
  getDataSourceTables = () => {
    throw new Error("Method not implemented.");
  };
  getDeveloperMetadata = () => {
    throw new Error("Method not implemented.");
  };
  getEditors = () => {
    throw new Error("Method not implemented.");
  };
  getFormUrl = () => {
    throw new Error("Method not implemented.");
  };
  getFrozenColumns = () => {
    throw new Error("Method not implemented.");
  };
  getFrozenRows = () => {
    throw new Error("Method not implemented.");
  };
  getId = () => {
    return this.#spreadsheetId;
  };
  getImages = () => {
    throw new Error("Method not implemented.");
  };
  getIterativeCalculationConvergenceThreshold = () => {
    throw new Error("Method not implemented.");
  };
  getLastColumn = () => {
    throw new Error("Method not implemented.");
  };
  getLastRow = () => {
    throw new Error("Method not implemented.");
  };
  getMaxIterativeCalculationCycles = () => {
    throw new Error("Method not implemented.");
  };
  getName = () => {
    throw new Error("Method not implemented.");
  };
  getNamedRanges = () => {
    throw new Error("Method not implemented.");
  };
  getNumSheets = () => {
    throw new Error("Method not implemented.");
  };
  getOwner = () => {
    throw new Error("Method not implemented.");
  };
  getPredefinedSpreadsheetThemes = () => {
    throw new Error("Method not implemented.");
  };
  getProtections = (type: GoogleAppsScript.Spreadsheet.ProtectionType) => {
    throw new Error("Method not implemented.");
  };
  getRange = (a1Notation: string) => {
    throw new Error("Method not implemented.");
  };
  getRangeByName = (name: string) => {
    throw new Error("Method not implemented.");
  };
  getRangeList = (a1Notations: string[]) => {
    throw new Error("Method not implemented.");
  };
  getRecalculationInterval = () => {
    throw new Error("Method not implemented.");
  };
  getRowHeight = (rowPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  getSelection = () => {
    throw new Error("Method not implemented.");
  };
  getSheetById = (id: number) => {
    return this.#createSheet(this.#spreadsheetId, id);
  };
  getSheetByName = (name: string) => {
    throw new Error("Method not implemented.");
  };
  getSheetId = () => {
    throw new Error("Method not implemented.");
  };
  getSheetName = () => {
    throw new Error("Method not implemented.");
  };
  getSheetValues = (
    startRow: GoogleAppsScript.Integer,
    startColumn: GoogleAppsScript.Integer,
    numRows: GoogleAppsScript.Integer,
    numColumns: GoogleAppsScript.Integer,
  ) => {
    throw new Error("Method not implemented.");
  };
  getSheets = () => {
    throw new Error("Method not implemented.");
  };
  getSpreadsheetLocale = () => {
    throw new Error("Method not implemented.");
  };
  getSpreadsheetTheme = () => {
    throw new Error("Method not implemented.");
  };
  getSpreadsheetTimeZone = () => {
    throw new Error("Method not implemented.");
  };
  getUrl = () => {
    throw new Error("Method not implemented.");
  };
  getViewers = () => {
    throw new Error("Method not implemented.");
  };
  hideColumn = (column: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  hideRow = (row: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  insertColumnAfter = (afterPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  insertColumnBefore = (beforePosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  insertColumnsAfter = (
    afterPosition: GoogleAppsScript.Integer,
    howMany: GoogleAppsScript.Integer,
  ) => {
    throw new Error("Method not implemented.");
  };
  insertColumnsBefore = (
    beforePosition: GoogleAppsScript.Integer,
    howMany: GoogleAppsScript.Integer,
  ) => {
    throw new Error("Method not implemented.");
  };
  insertImage = (
    url: unknown,
    column: unknown,
    row: unknown,
    offsetX?: unknown,
    offsetY?: unknown,
  ) => {
    throw new Error("Method not implemented.");
  };
  insertRowAfter = (afterPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  insertRowBefore = (beforePosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  insertRowsAfter = (
    afterPosition: GoogleAppsScript.Integer,
    howMany: GoogleAppsScript.Integer,
  ) => {
    throw new Error("Method not implemented.");
  };
  insertRowsBefore = (
    beforePosition: GoogleAppsScript.Integer,
    howMany: GoogleAppsScript.Integer,
  ) => {
    throw new Error("Method not implemented.");
  };
  insertSheet = (sheetName?: unknown, sheetIndex?: unknown, options?: unknown) => {
    throw new Error("Method not implemented.");
  };
  insertSheetWithDataSourceTable = (spec: GoogleAppsScript.Spreadsheet.DataSourceSpec) => {
    throw new Error("Method not implemented.");
  };
  isColumnHiddenByUser = (columnPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  isIterativeCalculationEnabled = () => {
    throw new Error("Method not implemented.");
  };
  isRowHiddenByFilter = (rowPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  isRowHiddenByUser = (rowPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  moveActiveSheet = (pos: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  moveChartToObjectSheet = (chart: GoogleAppsScript.Spreadsheet.EmbeddedChart) => {
    throw new Error("Method not implemented.");
  };
  removeEditor = (user: unknown) => {
    throw new Error("Method not implemented.");
  };
  removeMenu = (name: string) => {
    throw new Error("Method not implemented.");
  };
  removeNamedRange = (name: string) => {
    throw new Error("Method not implemented.");
  };
  removeViewer = (user: unknown) => {
    throw new Error("Method not implemented.");
  };
  rename = (newName: string) => {
    throw new Error("Method not implemented.");
  };
  renameActiveSheet = (newName: string) => {
    throw new Error("Method not implemented.");
  };
  resetSpreadsheetTheme = () => {
    throw new Error("Method not implemented.");
  };
  setActiveRange = (range: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  setActiveRangeList = (rangeList: GoogleAppsScript.Spreadsheet.RangeList) => {
    throw new Error("Method not implemented.");
  };
  setActiveSelection = (a1Notation: unknown) => {
    throw new Error("Method not implemented.");
  };
  setActiveSheet = (sheet: unknown, restoreSelection?: unknown) => {
    throw new Error("Method not implemented.");
  };
  setColumnWidth = (columnPosition: GoogleAppsScript.Integer, width: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  setCurrentCell = (cell: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  setFrozenColumns = (columns: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  setFrozenRows = (rows: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  setIterativeCalculationConvergenceThreshold = (minThreshold: number) => {
    throw new Error("Method not implemented.");
  };
  setIterativeCalculationEnabled = (isEnabled: boolean) => {
    throw new Error("Method not implemented.");
  };
  setMaxIterativeCalculationCycles = (maxIterations: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  setNamedRange = (name: string, range: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  setRecalculationInterval = (
    recalculationInterval: GoogleAppsScript.Spreadsheet.RecalculationInterval,
  ) => {
    throw new Error("Method not implemented.");
  };
  setRowHeight = (rowPosition: GoogleAppsScript.Integer, height: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  setSpreadsheetLocale = (locale: string) => {
    throw new Error("Method not implemented.");
  };
  setSpreadsheetTheme = (theme: GoogleAppsScript.Spreadsheet.SpreadsheetTheme) => {
    throw new Error("Method not implemented.");
  };
  setSpreadsheetTimeZone = (timezone: string) => {
    throw new Error("Method not implemented.");
  };
  show = (userInterface: GoogleAppsScript.HTML.HtmlOutput) => {
    throw new Error("Method not implemented.");
  };
  sort = (columnPosition: unknown, ascending?: unknown) => {
    throw new Error("Method not implemented.");
  };
  toast = (msg: unknown, title?: unknown, timeoutSeconds?: unknown) => {
    throw new Error("Method not implemented.");
  };
  unhideColumn = (column: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  unhideRow = (row: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  updateMenu = (name: string, subMenus: Array<{ name: string; functionName: string }>) => {
    throw new Error("Method not implemented.");
  };
  /** @deprecated DO NOT USE */
  getSheetProtection = () => {
    throw new Error("Spreadsheet#getSheetProtection() is deprecated. Do not use.");
  };
  /** @deprecated DO NOT USE */
  isAnonymousView = () => {
    throw new Error("Spreadsheet#isAnonymousView() is deprecated. Do not use.");
  };
  /** @deprecated DO NOT USE */
  isAnonymousWrite = () => {
    throw new Error("Spreadsheet#isAnonymousWrite() is deprecated. Do not use.");
  };
  /** @deprecated DO NOT USE */
  // oxlint-disable-next-line no-unused-vars
  setAnonymousAccess = (anonymousReadAllowed: boolean, anonymousWriteAllowed: boolean) => {
    throw new Error("Spreadsheet#setAnonymousAccess() is deprecated. Do not use.");
  };
  /** @deprecated DO NOT USE */
  // oxlint-disable-next-line no-unused-vars
  setSheetProtection = (permissions: GoogleAppsScript.Spreadsheet.PageProtection) => {
    throw new Error("Spreadsheet#setSheetProtection() is deprecated. Do not use.");
  };
}
