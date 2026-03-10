// https://developers.google.com/apps-script/reference/spreadsheet/sheet
export class Sheet implements GoogleAppsScript.Spreadsheet.Sheet {
  #spreadsheetId: string;
  #sheetId: number;
  #RangeClass: new (...args: any[]) => GoogleAppsScript.Spreadsheet.Range;
  #requestSync: Function;

  constructor(
    spreadsheetId: string,
    sheetId: number,
    RangeClass: new (...args: any[]) => GoogleAppsScript.Spreadsheet.Range,
    requestSync: Function,
  ) {
    this.#spreadsheetId = spreadsheetId;
    this.#sheetId = sheetId;
    this.#RangeClass = RangeClass;
    this.#requestSync = requestSync;
  }

  activate = () => {
    throw new Error("Method not implemented.");
  };
  addDeveloperMetadata = (key: unknown, value?: unknown, visibility?: unknown) => {
    throw new Error("Method not implemented.");
  };
  appendRow = (rowContents: any[]) => {
    throw new Error("Method not implemented.");
  };
  asDataSourceSheet = () => {
    throw new Error("Method not implemented.");
  };
  autoResizeColumn = (columnPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  autoResizeColumns = (
    startColumn: GoogleAppsScript.Integer,
    numColumns: GoogleAppsScript.Integer,
  ) => {
    throw new Error("Method not implemented.");
  };
  autoResizeRows = (startRow: GoogleAppsScript.Integer, numRows: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  clear = (options?: unknown) => {
    throw new Error("Method not implemented.");
  };
  clearConditionalFormatRules = () => {
    throw new Error("Method not implemented.");
  };
  clearContents = () => {
    throw new Error("Method not implemented.");
  };
  clearFormats = () => {
    throw new Error("Method not implemented.");
  };
  clearNotes = () => {
    throw new Error("Method not implemented.");
  };
  collapseAllColumnGroups = () => {
    throw new Error("Method not implemented.");
  };
  collapseAllRowGroups = () => {
    throw new Error("Method not implemented.");
  };
  copyTo = (spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet) => {
    throw new Error("Method not implemented.");
  };
  createDeveloperMetadataFinder = () => {
    throw new Error("Method not implemented.");
  };
  createTextFinder = (findText: string) => {
    throw new Error("Method not implemented.");
  };
  deleteColumn = (columnPosition: GoogleAppsScript.Integer) => {
    this.#requestSync({
      message: `${this.constructor.name}#deleteColumn`,
      payload: { spreadsheetId: this.#spreadsheetId, sheetId: this.#sheetId, columnPosition },
    });
    return this;
  };
  deleteColumns = (columnPosition: GoogleAppsScript.Integer, howMany: GoogleAppsScript.Integer) => {
    this.#requestSync({
      message: `${this.constructor.name}#deleteColumns`,
      payload: {
        spreadsheetId: this.#spreadsheetId,
        sheetId: this.#sheetId,
        columnPosition,
        howMany,
      },
    });
    return this;
  };
  deleteRow = (rowPosition: GoogleAppsScript.Integer) => {
    this.#requestSync({
      message: `${this.constructor.name}#deleteRow`,
      payload: { spreadsheetId: this.#spreadsheetId, sheetId: this.#sheetId, rowPosition },
    });
    return this;
  };
  deleteRows = (rowPosition: GoogleAppsScript.Integer, howMany: GoogleAppsScript.Integer) => {
    this.#requestSync({
      message: `${this.constructor.name}#deleteRows`,
      payload: { spreadsheetId: this.#spreadsheetId, sheetId: this.#sheetId, rowPosition, howMany },
    });
    return this;
  };
  expandAllColumnGroups = () => {
    throw new Error("Method not implemented.");
  };
  expandAllRowGroups = () => {
    throw new Error("Method not implemented.");
  };
  expandColumnGroupsUpToDepth = (groupDepth: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  expandRowGroupsUpToDepth = (groupDepth: GoogleAppsScript.Integer) => {
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
  getBandings = () => {
    throw new Error("Method not implemented.");
  };
  getCharts = () => {
    throw new Error("Method not implemented.");
  };
  getColumnGroup = (
    columnIndex: GoogleAppsScript.Integer,
    groupDepth: GoogleAppsScript.Integer,
  ) => {
    throw new Error("Method not implemented.");
  };
  getColumnGroupControlPosition = () => {
    throw new Error("Method not implemented.");
  };
  getColumnGroupDepth = (columnIndex: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  getColumnWidth = (columnPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  getConditionalFormatRules = () => {
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
  getDrawings = () => {
    throw new Error("Method not implemented.");
  };
  getFilter = () => {
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
  getImages = () => {
    throw new Error("Method not implemented.");
  };
  getIndex = () => {
    throw new Error("Method not implemented.");
  };
  getLastColumn = () => {
    throw new Error("Method not implemented.");
  };
  getLastRow = () => {
    throw new Error("Method not implemented.");
  };
  getMaxColumns = () => {
    throw new Error("Method not implemented.");
  };
  getMaxRows = () => {
    throw new Error("Method not implemented.");
  };
  getName = () => {
    throw new Error("Method not implemented.");
  };
  getNamedRanges = () => {
    throw new Error("Method not implemented.");
  };
  getParent = () => {
    throw new Error("Method not implemented.");
  };
  getPivotTables = () => {
    throw new Error("Method not implemented.");
  };
  getProtections = (type: GoogleAppsScript.Spreadsheet.ProtectionType) => {
    throw new Error("Method not implemented.");
  };
  getRange = (
    rowOrA1Notation: GoogleAppsScript.Integer | string,
    column?: GoogleAppsScript.Integer,
    numRows?: GoogleAppsScript.Integer,
    numColumns?: GoogleAppsScript.Integer,
  ) => {
    return new this.#RangeClass(
      this.#spreadsheetId,
      this.#sheetId,
      rowOrA1Notation,
      column,
      numRows,
      numColumns,
      this.#requestSync,
    );
    throw new Error("Method not implemented.");
  };
  getRangeList = (a1Notations: string[]) => {
    throw new Error("Method not implemented.");
  };
  getRowGroup = (rowIndex: GoogleAppsScript.Integer, groupDepth: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  getRowGroupControlPosition = () => {
    throw new Error("Method not implemented.");
  };
  getRowGroupDepth = (rowIndex: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  getRowHeight = (rowPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  getSelection = () => {
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
  getSlicers = () => {
    throw new Error("Method not implemented.");
  };
  getType = () => {
    throw new Error("Method not implemented.");
  };
  hasHiddenGridlines = () => {
    throw new Error("Method not implemented.");
  };
  hideColumn = (column: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  hideColumns = (columnIndex: unknown, numColumns?: unknown) => {
    throw new Error("Method not implemented.");
  };
  hideRow = (row: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  hideRows = (rowIndex: unknown, numRows?: unknown) => {
    throw new Error("Method not implemented.");
  };
  hideSheet = () => {
    throw new Error("Method not implemented.");
  };
  insertChart = (chart: GoogleAppsScript.Spreadsheet.EmbeddedChart) => {
    throw new Error("Method not implemented.");
  };
  insertColumnAfter = (afterPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  insertColumnBefore = (beforePosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  insertColumns = (columnIndex: unknown, numColumns?: unknown) => {
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
  insertRows = (rowIndex: unknown, numRows?: unknown) => {
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
  insertSlicer = (
    range: unknown,
    anchorRowPos: unknown,
    anchorColPos: unknown,
    offsetX?: unknown,
    offsetY?: unknown,
  ) => {
    throw new Error("Method not implemented.");
  };
  isColumnHiddenByUser = (columnPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  isRightToLeft = () => {
    throw new Error("Method not implemented.");
  };
  isRowHiddenByFilter = (rowPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  isRowHiddenByUser = (rowPosition: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  isSheetHidden = () => {
    throw new Error("Method not implemented.");
  };
  moveColumns = (
    columnSpec: GoogleAppsScript.Spreadsheet.Range,
    destinationIndex: GoogleAppsScript.Integer,
  ) => {
    throw new Error("Method not implemented.");
  };
  moveRows = (
    rowSpec: GoogleAppsScript.Spreadsheet.Range,
    destinationIndex: GoogleAppsScript.Integer,
  ) => {
    throw new Error("Method not implemented.");
  };
  newChart = () => {
    throw new Error("Method not implemented.");
  };
  protect = () => {
    throw new Error("Method not implemented.");
  };
  removeChart = (chart: GoogleAppsScript.Spreadsheet.EmbeddedChart) => {
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
  setColumnGroupControlPosition = (
    position: GoogleAppsScript.Spreadsheet.GroupControlTogglePosition,
  ) => {
    throw new Error("Method not implemented.");
  };
  setColumnWidth = (columnPosition: GoogleAppsScript.Integer, width: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  setColumnWidths = (
    startColumn: GoogleAppsScript.Integer,
    numColumns: GoogleAppsScript.Integer,
    width: GoogleAppsScript.Integer,
  ) => {
    throw new Error("Method not implemented.");
  };
  setConditionalFormatRules = (rules: GoogleAppsScript.Spreadsheet.ConditionalFormatRule[]) => {
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
  setHiddenGridlines = (hideGridlines: boolean) => {
    throw new Error("Method not implemented.");
  };
  setName = (name: string) => {
    throw new Error("Method not implemented.");
  };
  setRightToLeft = (rightToLeft: boolean) => {
    throw new Error("Method not implemented.");
  };
  setRowGroupControlPosition = (
    position: GoogleAppsScript.Spreadsheet.GroupControlTogglePosition,
  ) => {
    throw new Error("Method not implemented.");
  };
  setRowHeight = (rowPosition: GoogleAppsScript.Integer, height: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  setRowHeights = (
    startRow: GoogleAppsScript.Integer,
    numRows: GoogleAppsScript.Integer,
    height: GoogleAppsScript.Integer,
  ) => {
    throw new Error("Method not implemented.");
  };
  setRowHeightsForced = (
    startRow: GoogleAppsScript.Integer,
    numRows: GoogleAppsScript.Integer,
    height: GoogleAppsScript.Integer,
  ) => {
    throw new Error("Method not implemented.");
  };
  /** @deprecated DO NOT USE */
  setTabColor = (color: string | null) => {
    throw new Error("Method not implemented.");
  };
  showColumns = (columnIndex: unknown, numColumns?: unknown) => {
    throw new Error("Method not implemented.");
  };
  showRows = (rowIndex: unknown, numRows?: unknown) => {
    throw new Error("Method not implemented.");
  };
  showSheet = () => {
    throw new Error("Method not implemented.");
  };
  sort = (columnPosition: unknown, ascending?: unknown) => {
    throw new Error("Method not implemented.");
  };
  unhideColumn = (column: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  unhideRow = (row: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  updateChart = (chart: GoogleAppsScript.Spreadsheet.EmbeddedChart) => {
    throw new Error("Method not implemented.");
  };
  /** @deprecated DO NOT USE */
  getSheetProtection = () => {
    throw new Error("Sheet#getSheetProtection() is deprecated. Do not use.");
  };
  /** @deprecated DO NOT USE */
  getTabColor = () => {
    throw new Error("Sheet#getTabColor() is deprecated. Do not use.");
  };
  /** @deprecated DO NOT USE */
  // oxlint-disable-next-line no-unused-vars
  setSheetProtection = (permissions: GoogleAppsScript.Spreadsheet.PageProtection) => {
    throw new Error("Sheet#setSheetProtection() is deprecated. Do not use.");
  };
}
