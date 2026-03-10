// https://developers.google.com/apps-script/reference/spreadsheet/range
export class Range implements GoogleAppsScript.Spreadsheet.Range {
  #spreadsheetId: string;
  #sheetId: number;
  #requestSync: Function;

  constructor(spreadsheetId: string, sheetId: number, requestSync: Function) {
    this.#spreadsheetId = spreadsheetId;
    this.#sheetId = sheetId;
    this.#requestSync = requestSync;
  }

  activate = () => {
    throw new Error("Method not implemented.");
  };
  activateAsCurrentCell = () => {
    throw new Error("Method not implemented.");
  };
  addDeveloperMetadata = (key: unknown, value?: unknown, visibility?: unknown) => {
    throw new Error("Method not implemented.");
  };
  applyColumnBanding = (bandingTheme?: unknown, showHeader?: unknown, showFooter?: unknown) => {
    throw new Error("Method not implemented.");
  };
  applyRowBanding = (bandingTheme?: unknown, showHeader?: unknown, showFooter?: unknown) => {
    throw new Error("Method not implemented.");
  };
  autoFill = (
    destination: GoogleAppsScript.Spreadsheet.Range,
    series: GoogleAppsScript.Spreadsheet.AutoFillSeries,
  ) => {
    throw new Error("Method not implemented.");
  };
  autoFillToNeighbor = (series: GoogleAppsScript.Spreadsheet.AutoFillSeries) => {
    throw new Error("Method not implemented.");
  };
  breakApart = () => {
    throw new Error("Method not implemented.");
  };
  canEdit = () => {
    throw new Error("Method not implemented.");
  };
  check = () => {
    throw new Error("Method not implemented.");
  };
  clear = (options?: unknown) => {
    throw new Error("Method not implemented.");
  };
  clearContent = () => {
    throw new Error("Method not implemented.");
  };
  clearDataValidations = () => {
    throw new Error("Method not implemented.");
  };
  clearFormat = () => {
    throw new Error("Method not implemented.");
  };
  clearNote = () => {
    throw new Error("Method not implemented.");
  };
  collapseGroups = () => {
    throw new Error("Method not implemented.");
  };
  copyFormatToRange = (
    sheet: unknown,
    column: unknown,
    columnEnd: unknown,
    row: unknown,
    rowEnd: unknown,
  ) => {
    throw new Error("Method not implemented.");
  };
  copyTo = (destination: unknown, copyPasteType?: unknown, transposed?: unknown) => {
    throw new Error("Method not implemented.");
  };
  copyValuesToRange = (
    sheet: unknown,
    column: unknown,
    columnEnd: unknown,
    row: unknown,
    rowEnd: unknown,
  ) => {
    throw new Error("Method not implemented.");
  };
  createDataSourcePivotTable = (dataSource: GoogleAppsScript.Spreadsheet.DataSource) => {
    throw new Error("Method not implemented.");
  };
  createDataSourceTable = (dataSource: GoogleAppsScript.Spreadsheet.DataSource) => {
    throw new Error("Method not implemented.");
  };
  createDeveloperMetadataFinder = () => {
    throw new Error("Method not implemented.");
  };
  createFilter = () => {
    throw new Error("Method not implemented.");
  };
  createPivotTable = (sourceData: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  createTextFinder = (findText: string) => {
    throw new Error("Method not implemented.");
  };
  deleteCells = (shiftDimension: GoogleAppsScript.Spreadsheet.Dimension) => {
    throw new Error("Method not implemented.");
  };
  expandGroups = () => {
    throw new Error("Method not implemented.");
  };
  getA1Notation = () => {
    throw new Error("Method not implemented.");
  };
  getBackground = () => {
    throw new Error("Method not implemented.");
  };
  getBackgroundObject = () => {
    throw new Error("Method not implemented.");
  };
  getBackgroundObjects = () => {
    throw new Error("Method not implemented.");
  };
  getBackgrounds = () => {
    throw new Error("Method not implemented.");
  };
  getBandings = () => {
    throw new Error("Method not implemented.");
  };
  getCell = (row: GoogleAppsScript.Integer, column: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  getColumn = () => {
    throw new Error("Method not implemented.");
  };
  getDataRegion = (dimension?: unknown) => {
    throw new Error("Method not implemented.");
  };
  getDataSourceFormula = () => {
    throw new Error("Method not implemented.");
  };
  getDataSourceFormulas = () => {
    throw new Error("Method not implemented.");
  };
  getDataSourcePivotTables = () => {
    throw new Error("Method not implemented.");
  };
  getDataSourceTables = () => {
    throw new Error("Method not implemented.");
  };
  getDataSourceUrl = () => {
    throw new Error("Method not implemented.");
  };
  getDataTable = (firstRowIsHeader?: unknown) => {
    throw new Error("Method not implemented.");
  };
  getDataValidation = () => {
    throw new Error("Method not implemented.");
  };
  getDataValidations = () => {
    throw new Error("Method not implemented.");
  };
  getDeveloperMetadata = () => {
    throw new Error("Method not implemented.");
  };
  getDisplayValue = () => {
    throw new Error("Method not implemented.");
  };
  getDisplayValues = () => {
    throw new Error("Method not implemented.");
  };
  getFilter = () => {
    throw new Error("Method not implemented.");
  };
  getFontColorObject = () => {
    throw new Error("Method not implemented.");
  };
  getFontColorObjects = () => {
    throw new Error("Method not implemented.");
  };
  getFontFamilies = () => {
    throw new Error("Method not implemented.");
  };
  getFontFamily = () => {
    throw new Error("Method not implemented.");
  };
  getFontLine = () => {
    throw new Error("Method not implemented.");
  };
  getFontLines = () => {
    throw new Error("Method not implemented.");
  };
  getFontSize = () => {
    throw new Error("Method not implemented.");
  };
  getFontSizes = () => {
    throw new Error("Method not implemented.");
  };
  getFontStyle = () => {
    throw new Error("Method not implemented.");
  };
  getFontStyles = () => {
    throw new Error("Method not implemented.");
  };
  getFontWeight = () => {
    throw new Error("Method not implemented.");
  };
  getFontWeights = () => {
    throw new Error("Method not implemented.");
  };
  getFormula = () => {
    throw new Error("Method not implemented.");
  };
  getFormulaR1C1 = () => {
    throw new Error("Method not implemented.");
  };
  getFormulas = () => {
    throw new Error("Method not implemented.");
  };
  getFormulasR1C1 = () => {
    throw new Error("Method not implemented.");
  };
  getGridId = () => {
    throw new Error("Method not implemented.");
  };
  getHeight = () => {
    throw new Error("Method not implemented.");
  };
  getHorizontalAlignment = () => {
    throw new Error("Method not implemented.");
  };
  getHorizontalAlignments = () => {
    throw new Error("Method not implemented.");
  };
  getLastColumn = () => {
    throw new Error("Method not implemented.");
  };
  getLastRow = () => {
    throw new Error("Method not implemented.");
  };
  getMergedRanges = () => {
    throw new Error("Method not implemented.");
  };
  getNextDataCell = (direction: GoogleAppsScript.Spreadsheet.Direction) => {
    throw new Error("Method not implemented.");
  };
  getNote = () => {
    throw new Error("Method not implemented.");
  };
  getNotes = () => {
    throw new Error("Method not implemented.");
  };
  getNumColumns = () => {
    throw new Error("Method not implemented.");
  };
  getNumRows = () => {
    throw new Error("Method not implemented.");
  };
  getNumberFormat = () => {
    throw new Error("Method not implemented.");
  };
  getNumberFormats = () => {
    throw new Error("Method not implemented.");
  };
  getRichTextValue = () => {
    throw new Error("Method not implemented.");
  };
  getRichTextValues = () => {
    throw new Error("Method not implemented.");
  };
  getRow = () => {
    throw new Error("Method not implemented.");
  };
  getRowIndex = () => {
    throw new Error("Method not implemented.");
  };
  getSheet = () => {
    throw new Error("Method not implemented.");
  };
  getTextDirection = () => {
    throw new Error("Method not implemented.");
  };
  getTextDirections = () => {
    throw new Error("Method not implemented.");
  };
  getTextRotation = () => {
    throw new Error("Method not implemented.");
  };
  getTextRotations = () => {
    throw new Error("Method not implemented.");
  };
  getTextStyle = () => {
    throw new Error("Method not implemented.");
  };
  getTextStyles = () => {
    throw new Error("Method not implemented.");
  };
  getValue = () => {
    return this.#requestSync({ message: "Range#getValue" });
  };
  getValues = () => {
    return this.#requestSync({ message: "Range#getValues" });
  };
  getVerticalAlignment = () => {
    throw new Error("Method not implemented.");
  };
  getVerticalAlignments = () => {
    throw new Error("Method not implemented.");
  };
  getWidth = () => {
    throw new Error("Method not implemented.");
  };
  getWrap = () => {
    throw new Error("Method not implemented.");
  };
  getWrapStrategies = () => {
    throw new Error("Method not implemented.");
  };
  getWrapStrategy = () => {
    throw new Error("Method not implemented.");
  };
  getWraps = () => {
    throw new Error("Method not implemented.");
  };
  insertCells = (shiftDimension: GoogleAppsScript.Spreadsheet.Dimension) => {
    throw new Error("Method not implemented.");
  };
  insertCheckboxes = (checkedValue?: unknown, uncheckedValue?: unknown) => {
    throw new Error("Method not implemented.");
  };
  isBlank = () => {
    throw new Error("Method not implemented.");
  };
  isChecked = () => {
    throw new Error("Method not implemented.");
  };
  isEndColumnBounded = () => {
    throw new Error("Method not implemented.");
  };
  isEndRowBounded = () => {
    throw new Error("Method not implemented.");
  };
  isPartOfMerge = () => {
    throw new Error("Method not implemented.");
  };
  isStartColumnBounded = () => {
    throw new Error("Method not implemented.");
  };
  isStartRowBounded = () => {
    throw new Error("Method not implemented.");
  };
  merge = () => {
    throw new Error("Method not implemented.");
  };
  mergeAcross = () => {
    throw new Error("Method not implemented.");
  };
  mergeVertically = () => {
    throw new Error("Method not implemented.");
  };
  moveTo = (target: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  offset = (rowOffset: unknown, columnOffset: unknown, numRows?: unknown, numColumns?: unknown) => {
    throw new Error("Method not implemented.");
  };
  protect = () => {
    throw new Error("Method not implemented.");
  };
  randomize = () => {
    throw new Error("Method not implemented.");
  };
  removeCheckboxes = () => {
    throw new Error("Method not implemented.");
  };
  removeDuplicates = (columnsToCompare?: unknown) => {
    throw new Error("Method not implemented.");
  };
  setBackground = (color: string | null) => {
    throw new Error("Method not implemented.");
  };
  setBackgroundObject = (color: GoogleAppsScript.Spreadsheet.Color | null) => {
    throw new Error("Method not implemented.");
  };
  setBackgroundObjects = (color: GoogleAppsScript.Spreadsheet.Color[][] | null) => {
    throw new Error("Method not implemented.");
  };
  setBackgroundRGB = (
    red: GoogleAppsScript.Integer,
    green: GoogleAppsScript.Integer,
    blue: GoogleAppsScript.Integer,
  ) => {
    throw new Error("Method not implemented.");
  };
  setBackgrounds = (color: Array<Array<string | null>>) => {
    throw new Error("Method not implemented.");
  };
  setBorder = (
    top: unknown,
    left: unknown,
    bottom: unknown,
    right: unknown,
    vertical: unknown,
    horizontal: unknown,
    color?: unknown,
    style?: unknown,
  ) => {
    throw new Error("Method not implemented.");
  };
  setDataValidation = (rule: GoogleAppsScript.Spreadsheet.DataValidation | null) => {
    throw new Error("Method not implemented.");
  };
  setDataValidations = (
    rules: Array<Array<GoogleAppsScript.Spreadsheet.DataValidation | null>>,
  ) => {
    throw new Error("Method not implemented.");
  };
  setFontColor = (color: string | null) => {
    throw new Error("Method not implemented.");
  };
  setFontColorObject = (color: GoogleAppsScript.Spreadsheet.Color | null) => {
    throw new Error("Method not implemented.");
  };
  setFontColorObjects = (colors: Array<Array<GoogleAppsScript.Spreadsheet.Color | null>>) => {
    throw new Error("Method not implemented.");
  };
  setFontColors = (colors: any[][]) => {
    throw new Error("Method not implemented.");
  };
  setFontFamilies = (fontFamilies: Array<Array<string | null>>) => {
    throw new Error("Method not implemented.");
  };
  setFontFamily = (fontFamily: string | null) => {
    throw new Error("Method not implemented.");
  };
  setFontLine = (fontLine: GoogleAppsScript.Spreadsheet.FontLine | null) => {
    throw new Error("Method not implemented.");
  };
  setFontLines = (fontLines: Array<Array<GoogleAppsScript.Spreadsheet.FontLine | null>>) => {
    throw new Error("Method not implemented.");
  };
  setFontSize = (size: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  setFontSizes = (sizes: GoogleAppsScript.Integer[][]) => {
    throw new Error("Method not implemented.");
  };
  setFontStyle = (fontStyle: GoogleAppsScript.Spreadsheet.FontStyle | null) => {
    throw new Error("Method not implemented.");
  };
  setFontStyles = (fontStyles: Array<Array<GoogleAppsScript.Spreadsheet.FontStyle | null>>) => {
    throw new Error("Method not implemented.");
  };
  setFontWeight = (fontWeight: GoogleAppsScript.Spreadsheet.FontWeight | null) => {
    throw new Error("Method not implemented.");
  };
  setFontWeights = (fontWeights: Array<Array<GoogleAppsScript.Spreadsheet.FontWeight | null>>) => {
    throw new Error("Method not implemented.");
  };
  setFormula = (formula: string) => {
    throw new Error("Method not implemented.");
  };
  setFormulaR1C1 = (formula: string) => {
    throw new Error("Method not implemented.");
  };
  setFormulas = (formulas: string[][]) => {
    throw new Error("Method not implemented.");
  };
  setFormulasR1C1 = (formulas: string[][]) => {
    throw new Error("Method not implemented.");
  };
  setHorizontalAlignment = (alignment: "left" | "center" | "normal" | "right" | null) => {
    throw new Error("Method not implemented.");
  };
  setHorizontalAlignments = (
    alignments: Array<Array<"left" | "center" | "normal" | "right" | null>>,
  ) => {
    throw new Error("Method not implemented.");
  };
  setNote = (note: string | null) => {
    throw new Error("Method not implemented.");
  };
  setNotes = (notes: Array<Array<string | null>>) => {
    throw new Error("Method not implemented.");
  };
  setNumberFormat = (numberFormat: string) => {
    throw new Error("Method not implemented.");
  };
  setNumberFormats = (numberFormats: string[][]) => {
    throw new Error("Method not implemented.");
  };
  setRichTextValue = (value: GoogleAppsScript.Spreadsheet.RichTextValue) => {
    throw new Error("Method not implemented.");
  };
  setRichTextValues = (values: GoogleAppsScript.Spreadsheet.RichTextValue[][]) => {
    throw new Error("Method not implemented.");
  };
  setShowHyperlink = (showHyperlink: boolean) => {
    throw new Error("Method not implemented.");
  };
  setTextDirection = (direction: GoogleAppsScript.Spreadsheet.TextDirection | null) => {
    throw new Error("Method not implemented.");
  };
  setTextDirections = (
    directions: Array<Array<GoogleAppsScript.Spreadsheet.TextDirection | null>>,
  ) => {
    throw new Error("Method not implemented.");
  };
  setTextRotation = (rotation: unknown) => {
    throw new Error("Method not implemented.");
  };
  setTextRotations = (rotations: GoogleAppsScript.Spreadsheet.TextRotation[][]) => {
    throw new Error("Method not implemented.");
  };
  setTextStyle = (style: GoogleAppsScript.Spreadsheet.TextStyle) => {
    throw new Error("Method not implemented.");
  };
  setTextStyles = (styles: GoogleAppsScript.Spreadsheet.TextStyle[][]) => {
    throw new Error("Method not implemented.");
  };
  setValue = (value: any) => {
    return this.#requestSync({ message: "Range#getValues" });
    throw new Error("Method not implemented.");
  };
  setValues = (values: any[][]) => {
    throw new Error("Method not implemented.");
  };
  setVerticalAlignment = (alignment: "top" | "middle" | "bottom" | null) => {
    throw new Error("Method not implemented.");
  };
  setVerticalAlignments = (alignments: Array<Array<"top" | "middle" | "bottom" | null>>) => {
    throw new Error("Method not implemented.");
  };
  setVerticalText = (isVertical: boolean) => {
    throw new Error("Method not implemented.");
  };
  setWrap = (isWrapEnabled: boolean) => {
    throw new Error("Method not implemented.");
  };
  setWrapStrategies = (strategies: GoogleAppsScript.Spreadsheet.WrapStrategy[][]) => {
    throw new Error("Method not implemented.");
  };
  setWrapStrategy = (strategy: GoogleAppsScript.Spreadsheet.WrapStrategy) => {
    throw new Error("Method not implemented.");
  };
  setWraps = (isWrapEnabled: boolean[][]) => {
    throw new Error("Method not implemented.");
  };
  shiftColumnGroupDepth = (delta: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  shiftRowGroupDepth = (delta: GoogleAppsScript.Integer) => {
    throw new Error("Method not implemented.");
  };
  sort = (sortSpecObj: any) => {
    throw new Error("Method not implemented.");
  };
  splitTextToColumns = (delimiter?: unknown) => {
    throw new Error("Method not implemented.");
  };
  trimWhitespace = () => {
    throw new Error("Method not implemented.");
  };
  uncheck = () => {
    throw new Error("Method not implemented.");
  };
  /** @deprecated DO NOT USE */
  getFontColor = () => {
    throw new Error("Range#getFontColor() is deprecated. Do not use.");
  };
  /** @deprecated DO NOT USE */
  getFontColors = () => {
    throw new Error("Range#getFontColors() is deprecated. Do not use.");
  };
}
