import { CreateSpreadsheet, RequestSync } from "../..";

// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app
export class SpreadsheetApp implements GoogleAppsScript.Spreadsheet.SpreadsheetApp {
  #createSpreadsheet: CreateSpreadsheet;
  #requestSync: RequestSync;

  constructor(createSpreadsheet: CreateSpreadsheet, requestSync: RequestSync) {
    this.#createSpreadsheet = createSpreadsheet;
    this.#requestSync = requestSync;
  }

  AutoFillSeries = { DEFAULT_SERIES: 0, ALTERNATE_SERIES: 1 };
  BandingTheme = {
    LIGHT_GREY: 0,
    CYAN: 1,
    GREEN: 2,
    YELLOW: 3,
    ORANGE: 4,
    BLUE: 5,
    TEAL: 6,
    GREY: 7,
    BROWN: 8,
    LIGHT_GREEN: 9,
    INDIGO: 10,
    PINK: 11,
  };
  BooleanCriteria = {
    CELL_EMPTY: 0,
    CELL_NOT_EMPTY: 1,
    DATE_AFTER: 2,
    DATE_BEFORE: 3,
    DATE_EQUAL_TO: 4,
    DATE_AFTER_RELATIVE: 5,
    DATE_BEFORE_RELATIVE: 6,
    DATE_EQUAL_TO_RELATIVE: 7,
    NUMBER_BETWEEN: 8,
    NUMBER_EQUAL_TO: 9,
    NUMBER_GREATER_THAN: 10,
    NUMBER_GREATER_THAN_OR_EQUAL_TO: 11,
    NUMBER_LESS_THAN: 12,
    NUMBER_LESS_THAN_OR_EQUAL_TO: 13,
    NUMBER_NOT_BETWEEN: 14,
    NUMBER_NOT_EQUAL_TO: 15,
    TEXT_CONTAINS: 16,
    TEXT_DOES_NOT_CONTAIN: 17,
    TEXT_EQUAL_TO: 18,
    TEXT_STARTS_WITH: 19,
    TEXT_ENDS_WITH: 20,
    CUSTOM_FORMULA: 21,
  };
  BorderStyle = {
    DOTTED: 0,
    DASHED: 1,
    SOLID: 2,
    SOLID_MEDIUM: 3,
    SOLID_THICK: 4,
    DOUBLE: 5,
  };
  ColorType = { UNSUPPORTED: 0, RGB: 1, THEME: 2 };
  CopyPasteType = {
    PASTE_NORMAL: 0,
    PASTE_NO_BORDERS: 1,
    PASTE_FORMAT: 2,
    PASTE_FORMULA: 3,
    PASTE_DATA_VALIDATION: 4,
    PASTE_VALUES: 5,
    PASTE_CONDITIONAL_FORMATTING: 6,
    PASTE_COLUMN_WIDTHS: 7,
  };
  DataExecutionErrorCode = {
    DATA_EXECUTION_ERROR_CODE_UNSUPPORTED: 0,
    NONE: 1,
    TIME_OUT: 2,
    TOO_MANY_ROWS: 3,
    TOO_MANY_CELLS: 4,
    ENGINE: 5,
    PARAMETER_INVALID: 6,
    UNSUPPORTED_DATA_TYPE: 7,
    DUPLICATE_COLUMN_NAMES: 8,
    INTERRUPTED: 9,
    OTHER: 10,
    TOO_MANY_CHARS_PER_CELL: 11,
  };
  DataExecutionState = {
    DATA_EXECUTION_STATE_UNSUPPORTED: 0,
    RUNNING: 1,
    SUCCESS: 2,
    ERROR: 3,
    NOT_STARTED: 4,
  };
  DataSourceParameterType = { DATA_SOURCE_PARAMETER_TYPE_UNSUPPORTED: 0, CELL: 1 };
  DataSourceType = { DATA_SOURCE_TYPE_UNSUPPORTED: 0, BIGQUERY: 1 };
  DataValidationCriteria = {
    DATE_AFTER: 0,
    DATE_BEFORE: 1,
    DATE_BETWEEN: 2,
    DATE_EQUAL_TO: 3,
    DATE_IS_VALID_DATE: 4,
    DATE_NOT_BETWEEN: 5,
    DATE_ON_OR_AFTER: 6,
    DATE_ON_OR_BEFORE: 7,
    NUMBER_BETWEEN: 8,
    NUMBER_EQUAL_TO: 9,
    NUMBER_GREATER_THAN: 10,
    NUMBER_GREATER_THAN_OR_EQUAL_TO: 11,
    NUMBER_LESS_THAN: 12,
    NUMBER_LESS_THAN_OR_EQUAL_TO: 13,
    NUMBER_NOT_BETWEEN: 14,
    NUMBER_NOT_EQUAL_TO: 15,
    TEXT_CONTAINS: 16,
    TEXT_DOES_NOT_CONTAIN: 17,
    TEXT_EQUAL_TO: 18,
    TEXT_IS_VALID_EMAIL: 19,
    TEXT_IS_VALID_URL: 20,
    VALUE_IN_LIST: 21,
    VALUE_IN_RANGE: 22,
    CUSTOM_FORMULA: 23,
    CHECKBOX: 24,
  };
  DeveloperMetadataLocationType = { SPREADSHEET: 0, SHEET: 1, ROW: 2, COLUMN: 3 };
  DeveloperMetadataVisibility = { DOCUMENT: 0, PROJECT: 1 };
  Dimension = { COLUMNS: 0, ROWS: 1 };
  Direction = { UP: 0, DOWN: 1, PREVIOUS: 2, NEXT: 3 };
  GroupControlTogglePosition = { BEFORE: 0, AFTER: 1 };
  InterpolationType = { NUMBER: 0, PERCENT: 1, PERCENTILE: 2, MIN: 3, MAX: 4 };
  PivotTableSummarizeFunction = {
    CUSTOM: 0,
    SUM: 1,
    COUNTA: 2,
    COUNT: 3,
    COUNTUNIQUE: 4,
    AVERAGE: 5,
    MAX: 6,
    MIN: 7,
    MEDIAN: 8,
    PRODUCT: 9,
    STDEV: 10,
    STDEVP: 11,
    VAR: 12,
    VARP: 13,
  };
  PivotValueDisplayType = {
    DEFAULT: 0,
    PERCENT_OF_ROW_TOTAL: 1,
    PERCENT_OF_COLUMN_TOTAL: 2,
    PERCENT_OF_GRAND_TOTAL: 3,
  };
  ProtectionType = { RANGE: 0, SHEET: 1 };
  RecalculationInterval = { ON_CHANGE: 0, MINUTE: 1, HOUR: 2 };
  RelativeDate = { TODAY: 0, TOMORROW: 1, YESTERDAY: 2, PAST_WEEK: 3, PAST_MONTH: 4, PAST_YEAR: 5 };
  SheetType = { GRID: 0, OBJECT: 1 };
  TextDirection = { LEFT_TO_RIGHT: 0, RIGHT_TO_LEFT: 1 };
  TextToColumnsDelimiter = { COMMA: 0, SEMICOLON: 1, PERIOD: 2, SPACE: 3 };
  ThemeColorType = {
    UNSUPPORTED: 0,
    TEXT: 1,
    BACKGROUND: 2,
    ACCENT1: 3,
    ACCENT2: 4,
    ACCENT3: 5,
    ACCENT4: 6,
    ACCENT5: 7,
    ACCENT6: 8,
    HYPERLINK: 9,
  };
  ValueType = { IMAGE: 0 };
  WrapStrategy = { WRAP: 0, OVERFLOW: 1, CLIP: 2 };

  create = (
    name: string,
    rows: GoogleAppsScript.Integer = 1000,
    columns: GoogleAppsScript.Integer = 26,
  ) => {
    const spreadSheetId = this.#requestSync({
      message: `${this.constructor.name}#create`,
      payload: { name, rows, columns },
    });
    return this.#createSpreadsheet(spreadSheetId);
  };
  enableAllDataSourcesExecution = () => {
    throw new Error("Method not implemented.");
  };
  enableBigQueryExecution = () => {
    throw new Error("Method not implemented.");
  };
  flush = () => {
    // It's equivalent to constantly flushing, so do nothing.
  };
  getActive = () => {
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
  getActiveSpreadsheet = () => {
    throw new Error("Method not implemented.");
  };
  getCurrentCell = () => {
    throw new Error("Method not implemented.");
  };
  getSelection = () => {
    throw new Error("Method not implemented.");
  };
  getUi = () => {
    throw new Error("Method not implemented.");
  };
  newCellImage = () => {
    throw new Error("Method not implemented.");
  };
  newColor = () => {
    throw new Error("Method not implemented.");
  };
  newConditionalFormatRule = () => {
    throw new Error("Method not implemented.");
  };
  newDataSourceSpec = () => {
    throw new Error("Method not implemented.");
  };
  newDataValidation = () => {
    throw new Error("Method not implemented.");
  };
  newFilterCriteria = () => {
    throw new Error("Method not implemented.");
  };
  newRichTextValue = () => {
    throw new Error("Method not implemented.");
  };
  newTextStyle = () => {
    throw new Error("Method not implemented.");
  };
  open = (file: GoogleAppsScript.Drive.File) => {
    const id = file.getId();
    return this.openById(id);
  };
  openById = (id: string) => {
    this.#requestSync({
      message: `${this.constructor.name}#openById`,
      payload: { id },
    });
    return this.#createSpreadsheet(id);
  };
  openByUrl = (url: string) => {
    const targetUrl = new URL(url);
    const id = targetUrl.pathname.split("/")[3];
    return this.openById(id);
  };
  setActiveRange = (range: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
  setActiveRangeList = (rangeList: GoogleAppsScript.Spreadsheet.RangeList) => {
    throw new Error("Method not implemented.");
  };
  setActiveSheet = (sheet: unknown, restoreSelection?: unknown) => {
    throw new Error("Method not implemented.");
  };
  setActiveSpreadsheet = (newActiveSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet) => {
    throw new Error("Method not implemented.");
  };
  setCurrentCell = (cell: GoogleAppsScript.Spreadsheet.Range) => {
    throw new Error("Method not implemented.");
  };
}
