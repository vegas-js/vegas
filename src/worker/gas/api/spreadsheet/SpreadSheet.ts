// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet
export class SpreadSheet implements GoogleAppsScript.Spreadsheet.Spreadsheet {
  addDeveloperMetadata(
    key: unknown,
    value?: unknown,
    visibility?: unknown,
  ): GoogleAppsScript.Spreadsheet.Spreadsheet {
    throw new Error("Method not implemented.");
  }
  addEditor(user: unknown): GoogleAppsScript.Spreadsheet.Spreadsheet {
    throw new Error("Method not implemented.");
  }
  addEditors(emailAddresses: string[]): GoogleAppsScript.Spreadsheet.Spreadsheet {
    throw new Error("Method not implemented.");
  }
  addMenu(name: string, subMenus: Array<{ name: string; functionName: string } | null>): void {
    throw new Error("Method not implemented.");
  }
  addViewer(user: unknown): GoogleAppsScript.Spreadsheet.Spreadsheet {
    throw new Error("Method not implemented.");
  }
  addViewers(emailAddresses: string[]): GoogleAppsScript.Spreadsheet.Spreadsheet {
    throw new Error("Method not implemented.");
  }
  appendRow(rowContents: any[]): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  autoResizeColumn(columnPosition: GoogleAppsScript.Integer): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  copy(name: string): GoogleAppsScript.Spreadsheet.Spreadsheet {
    throw new Error("Method not implemented.");
  }
  createDeveloperMetadataFinder(): GoogleAppsScript.Spreadsheet.DeveloperMetadataFinder {
    throw new Error("Method not implemented.");
  }
  createTextFinder(findText: string): GoogleAppsScript.Spreadsheet.TextFinder {
    throw new Error("Method not implemented.");
  }
  deleteActiveSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  deleteColumn(columnPosition: GoogleAppsScript.Integer): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  deleteColumns(columnPosition: GoogleAppsScript.Integer, howMany: GoogleAppsScript.Integer): void {
    throw new Error("Method not implemented.");
  }
  deleteRow(rowPosition: GoogleAppsScript.Integer): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  deleteRows(rowPosition: GoogleAppsScript.Integer, howMany: GoogleAppsScript.Integer): void {
    throw new Error("Method not implemented.");
  }
  deleteSheet(sheet: GoogleAppsScript.Spreadsheet.Sheet): void {
    throw new Error("Method not implemented.");
  }
  duplicateActiveSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  getActiveCell(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  getActiveRange(): GoogleAppsScript.Spreadsheet.Range | null {
    throw new Error("Method not implemented.");
  }
  getActiveRangeList(): GoogleAppsScript.Spreadsheet.RangeList | null {
    throw new Error("Method not implemented.");
  }
  getActiveSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  getAs(contentType: string): GoogleAppsScript.Base.Blob {
    throw new Error("Method not implemented.");
  }
  getBandings(): GoogleAppsScript.Spreadsheet.Banding[] {
    throw new Error("Method not implemented.");
  }
  getBlob(): GoogleAppsScript.Base.Blob {
    throw new Error("Method not implemented.");
  }
  getColumnWidth(columnPosition: GoogleAppsScript.Integer): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getCurrentCell(): GoogleAppsScript.Spreadsheet.Range | null {
    throw new Error("Method not implemented.");
  }
  getDataRange(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  getDataSourceTables(): GoogleAppsScript.Spreadsheet.DataSourceTable[] {
    throw new Error("Method not implemented.");
  }
  getDeveloperMetadata(): GoogleAppsScript.Spreadsheet.DeveloperMetadata[] {
    throw new Error("Method not implemented.");
  }
  getEditors(): GoogleAppsScript.Base.User[] {
    throw new Error("Method not implemented.");
  }
  getFormUrl(): string | null {
    throw new Error("Method not implemented.");
  }
  getFrozenColumns(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getFrozenRows(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getId(): string {
    throw new Error("Method not implemented.");
  }
  getImages(): GoogleAppsScript.Spreadsheet.OverGridImage[] {
    throw new Error("Method not implemented.");
  }
  getIterativeCalculationConvergenceThreshold(): number {
    throw new Error("Method not implemented.");
  }
  getLastColumn(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getLastRow(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getMaxIterativeCalculationCycles(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getName(): string {
    throw new Error("Method not implemented.");
  }
  getNamedRanges(): GoogleAppsScript.Spreadsheet.NamedRange[] {
    throw new Error("Method not implemented.");
  }
  getNumSheets(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getOwner(): GoogleAppsScript.Base.User | null {
    throw new Error("Method not implemented.");
  }
  getPredefinedSpreadsheetThemes(): GoogleAppsScript.Spreadsheet.SpreadsheetTheme[] {
    throw new Error("Method not implemented.");
  }
  getProtections(
    type: GoogleAppsScript.Spreadsheet.ProtectionType,
  ): GoogleAppsScript.Spreadsheet.Protection[] {
    throw new Error("Method not implemented.");
  }
  getRange(a1Notation: string): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  getRangeByName(name: string): GoogleAppsScript.Spreadsheet.Range | null {
    throw new Error("Method not implemented.");
  }
  getRangeList(a1Notations: string[]): GoogleAppsScript.Spreadsheet.RangeList {
    throw new Error("Method not implemented.");
  }
  getRecalculationInterval(): GoogleAppsScript.Spreadsheet.RecalculationInterval {
    throw new Error("Method not implemented.");
  }
  getRowHeight(rowPosition: GoogleAppsScript.Integer): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getSelection(): GoogleAppsScript.Spreadsheet.Selection {
    throw new Error("Method not implemented.");
  }
  getSheetById(id: number): GoogleAppsScript.Spreadsheet.Sheet | null {
    throw new Error("Method not implemented.");
  }
  getSheetByName(name: string): GoogleAppsScript.Spreadsheet.Sheet | null {
    throw new Error("Method not implemented.");
  }
  getSheetId(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getSheetName(): string {
    throw new Error("Method not implemented.");
  }
  getSheetValues(
    startRow: GoogleAppsScript.Integer,
    startColumn: GoogleAppsScript.Integer,
    numRows: GoogleAppsScript.Integer,
    numColumns: GoogleAppsScript.Integer,
  ): any[][] {
    throw new Error("Method not implemented.");
  }
  getSheets(): GoogleAppsScript.Spreadsheet.Sheet[] {
    throw new Error("Method not implemented.");
  }
  getSpreadsheetLocale(): string {
    throw new Error("Method not implemented.");
  }
  getSpreadsheetTheme(): GoogleAppsScript.Spreadsheet.SpreadsheetTheme | null {
    throw new Error("Method not implemented.");
  }
  getSpreadsheetTimeZone(): string {
    throw new Error("Method not implemented.");
  }
  getUrl(): string {
    throw new Error("Method not implemented.");
  }
  getViewers(): GoogleAppsScript.Base.User[] {
    throw new Error("Method not implemented.");
  }
  hideColumn(column: GoogleAppsScript.Spreadsheet.Range): void {
    throw new Error("Method not implemented.");
  }
  hideRow(row: GoogleAppsScript.Spreadsheet.Range): void {
    throw new Error("Method not implemented.");
  }
  insertColumnAfter(afterPosition: GoogleAppsScript.Integer): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  insertColumnBefore(beforePosition: GoogleAppsScript.Integer): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  insertColumnsAfter(
    afterPosition: GoogleAppsScript.Integer,
    howMany: GoogleAppsScript.Integer,
  ): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  insertColumnsBefore(
    beforePosition: GoogleAppsScript.Integer,
    howMany: GoogleAppsScript.Integer,
  ): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  insertImage(
    url: unknown,
    column: unknown,
    row: unknown,
    offsetX?: unknown,
    offsetY?: unknown,
  ): GoogleAppsScript.Spreadsheet.OverGridImage {
    throw new Error("Method not implemented.");
  }
  insertRowAfter(afterPosition: GoogleAppsScript.Integer): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  insertRowBefore(beforePosition: GoogleAppsScript.Integer): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  insertRowsAfter(
    afterPosition: GoogleAppsScript.Integer,
    howMany: GoogleAppsScript.Integer,
  ): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  insertRowsBefore(
    beforePosition: GoogleAppsScript.Integer,
    howMany: GoogleAppsScript.Integer,
  ): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  insertSheet(
    sheetName?: unknown,
    sheetIndex?: unknown,
    options?: unknown,
  ): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  insertSheetWithDataSourceTable(
    spec: GoogleAppsScript.Spreadsheet.DataSourceSpec,
  ): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  isColumnHiddenByUser(columnPosition: GoogleAppsScript.Integer): boolean {
    throw new Error("Method not implemented.");
  }
  isIterativeCalculationEnabled(): boolean {
    throw new Error("Method not implemented.");
  }
  isRowHiddenByFilter(rowPosition: GoogleAppsScript.Integer): boolean {
    throw new Error("Method not implemented.");
  }
  isRowHiddenByUser(rowPosition: GoogleAppsScript.Integer): boolean {
    throw new Error("Method not implemented.");
  }
  moveActiveSheet(pos: GoogleAppsScript.Integer): void {
    throw new Error("Method not implemented.");
  }
  moveChartToObjectSheet(
    chart: GoogleAppsScript.Spreadsheet.EmbeddedChart,
  ): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  removeEditor(user: unknown): GoogleAppsScript.Spreadsheet.Spreadsheet {
    throw new Error("Method not implemented.");
  }
  removeMenu(name: string): void {
    throw new Error("Method not implemented.");
  }
  removeNamedRange(name: string): void {
    throw new Error("Method not implemented.");
  }
  removeViewer(user: unknown): GoogleAppsScript.Spreadsheet.Spreadsheet {
    throw new Error("Method not implemented.");
  }
  rename(newName: string): void {
    throw new Error("Method not implemented.");
  }
  renameActiveSheet(newName: string): void {
    throw new Error("Method not implemented.");
  }
  resetSpreadsheetTheme(): GoogleAppsScript.Spreadsheet.SpreadsheetTheme {
    throw new Error("Method not implemented.");
  }
  setActiveRange(range: GoogleAppsScript.Spreadsheet.Range): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setActiveRangeList(
    rangeList: GoogleAppsScript.Spreadsheet.RangeList,
  ): GoogleAppsScript.Spreadsheet.RangeList {
    throw new Error("Method not implemented.");
  }
  setActiveSelection(a1Notation: unknown): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setActiveSheet(sheet: unknown, restoreSelection?: unknown): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  setColumnWidth(
    columnPosition: GoogleAppsScript.Integer,
    width: GoogleAppsScript.Integer,
  ): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  setCurrentCell(cell: GoogleAppsScript.Spreadsheet.Range): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFrozenColumns(columns: GoogleAppsScript.Integer): void {
    throw new Error("Method not implemented.");
  }
  setFrozenRows(rows: GoogleAppsScript.Integer): void {
    throw new Error("Method not implemented.");
  }
  setIterativeCalculationConvergenceThreshold(
    minThreshold: number,
  ): GoogleAppsScript.Spreadsheet.Spreadsheet {
    throw new Error("Method not implemented.");
  }
  setIterativeCalculationEnabled(isEnabled: boolean): GoogleAppsScript.Spreadsheet.Spreadsheet {
    throw new Error("Method not implemented.");
  }
  setMaxIterativeCalculationCycles(
    maxIterations: GoogleAppsScript.Integer,
  ): GoogleAppsScript.Spreadsheet.Spreadsheet {
    throw new Error("Method not implemented.");
  }
  setNamedRange(name: string, range: GoogleAppsScript.Spreadsheet.Range): void {
    throw new Error("Method not implemented.");
  }
  setRecalculationInterval(
    recalculationInterval: GoogleAppsScript.Spreadsheet.RecalculationInterval,
  ): GoogleAppsScript.Spreadsheet.Spreadsheet {
    throw new Error("Method not implemented.");
  }
  setRowHeight(
    rowPosition: GoogleAppsScript.Integer,
    height: GoogleAppsScript.Integer,
  ): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  setSpreadsheetLocale(locale: string): void {
    throw new Error("Method not implemented.");
  }
  setSpreadsheetTheme(
    theme: GoogleAppsScript.Spreadsheet.SpreadsheetTheme,
  ): GoogleAppsScript.Spreadsheet.SpreadsheetTheme {
    throw new Error("Method not implemented.");
  }
  setSpreadsheetTimeZone(timezone: string): void {
    throw new Error("Method not implemented.");
  }
  show(userInterface: GoogleAppsScript.HTML.HtmlOutput): void {
    throw new Error("Method not implemented.");
  }
  sort(columnPosition: unknown, ascending?: unknown): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  toast(msg: unknown, title?: unknown, timeoutSeconds?: unknown): void {
    throw new Error("Method not implemented.");
  }
  unhideColumn(column: GoogleAppsScript.Spreadsheet.Range): void {
    throw new Error("Method not implemented.");
  }
  unhideRow(row: GoogleAppsScript.Spreadsheet.Range): void {
    throw new Error("Method not implemented.");
  }
  updateMenu(name: string, subMenus: Array<{ name: string; functionName: string }>): void {
    throw new Error("Method not implemented.");
  }
  getSheetProtection(): GoogleAppsScript.Spreadsheet.PageProtection {
    throw new Error("Method not implemented.");
  }
  isAnonymousView(): boolean {
    throw new Error("Method not implemented.");
  }
  isAnonymousWrite(): boolean {
    throw new Error("Method not implemented.");
  }
  setAnonymousAccess(anonymousReadAllowed: boolean, anonymousWriteAllowed: boolean): void {
    throw new Error("Method not implemented.");
  }
  setSheetProtection(permissions: GoogleAppsScript.Spreadsheet.PageProtection): void {
    throw new Error("Method not implemented.");
  }
}
