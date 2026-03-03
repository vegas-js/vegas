// https://developers.google.com/apps-script/reference/spreadsheet/range
export class Range implements GoogleAppsScript.Spreadsheet.Range {
  activate(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  activateAsCurrentCell(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  addDeveloperMetadata(
    key: unknown,
    value?: unknown,
    visibility?: unknown,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  applyColumnBanding(
    bandingTheme?: unknown,
    showHeader?: unknown,
    showFooter?: unknown,
  ): GoogleAppsScript.Spreadsheet.Banding {
    throw new Error("Method not implemented.");
  }
  applyRowBanding(
    bandingTheme?: unknown,
    showHeader?: unknown,
    showFooter?: unknown,
  ): GoogleAppsScript.Spreadsheet.Banding {
    throw new Error("Method not implemented.");
  }
  autoFill(
    destination: GoogleAppsScript.Spreadsheet.Range,
    series: GoogleAppsScript.Spreadsheet.AutoFillSeries,
  ): void {
    throw new Error("Method not implemented.");
  }
  autoFillToNeighbor(series: GoogleAppsScript.Spreadsheet.AutoFillSeries): void {
    throw new Error("Method not implemented.");
  }
  breakApart(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  canEdit(): boolean {
    throw new Error("Method not implemented.");
  }
  check(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  clear(options?: unknown): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  clearContent(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  clearDataValidations(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  clearFormat(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  clearNote(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  collapseGroups(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  copyFormatToRange(
    sheet: unknown,
    column: unknown,
    columnEnd: unknown,
    row: unknown,
    rowEnd: unknown,
  ): void {
    throw new Error("Method not implemented.");
  }
  copyTo(destination: unknown, copyPasteType?: unknown, transposed?: unknown): void {
    throw new Error("Method not implemented.");
  }
  copyValuesToRange(
    sheet: unknown,
    column: unknown,
    columnEnd: unknown,
    row: unknown,
    rowEnd: unknown,
  ): void {
    throw new Error("Method not implemented.");
  }
  createDataSourcePivotTable(
    dataSource: GoogleAppsScript.Spreadsheet.DataSource,
  ): GoogleAppsScript.Spreadsheet.DataSourcePivotTable {
    throw new Error("Method not implemented.");
  }
  createDataSourceTable(
    dataSource: GoogleAppsScript.Spreadsheet.DataSource,
  ): GoogleAppsScript.Spreadsheet.DataSourceTable {
    throw new Error("Method not implemented.");
  }
  createDeveloperMetadataFinder(): GoogleAppsScript.Spreadsheet.DeveloperMetadataFinder {
    throw new Error("Method not implemented.");
  }
  createFilter(): GoogleAppsScript.Spreadsheet.Filter {
    throw new Error("Method not implemented.");
  }
  createPivotTable(
    sourceData: GoogleAppsScript.Spreadsheet.Range,
  ): GoogleAppsScript.Spreadsheet.PivotTable {
    throw new Error("Method not implemented.");
  }
  createTextFinder(findText: string): GoogleAppsScript.Spreadsheet.TextFinder {
    throw new Error("Method not implemented.");
  }
  deleteCells(shiftDimension: GoogleAppsScript.Spreadsheet.Dimension): void {
    throw new Error("Method not implemented.");
  }
  expandGroups(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  getA1Notation(): string {
    throw new Error("Method not implemented.");
  }
  getBackground(): string {
    throw new Error("Method not implemented.");
  }
  getBackgroundObject(): GoogleAppsScript.Spreadsheet.Color {
    throw new Error("Method not implemented.");
  }
  getBackgroundObjects(): GoogleAppsScript.Spreadsheet.Color[][] {
    throw new Error("Method not implemented.");
  }
  getBackgrounds(): string[][] {
    throw new Error("Method not implemented.");
  }
  getBandings(): GoogleAppsScript.Spreadsheet.Banding[] {
    throw new Error("Method not implemented.");
  }
  getCell(
    row: GoogleAppsScript.Integer,
    column: GoogleAppsScript.Integer,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  getColumn(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getDataRegion(dimension?: unknown): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  getDataSourceFormula(): GoogleAppsScript.Spreadsheet.DataSourceFormula {
    throw new Error("Method not implemented.");
  }
  getDataSourceFormulas(): GoogleAppsScript.Spreadsheet.DataSourceFormula[] {
    throw new Error("Method not implemented.");
  }
  getDataSourcePivotTables(): GoogleAppsScript.Spreadsheet.DataSourcePivotTable[] {
    throw new Error("Method not implemented.");
  }
  getDataSourceTables(): GoogleAppsScript.Spreadsheet.DataSourceTable[] {
    throw new Error("Method not implemented.");
  }
  getDataSourceUrl(): string {
    throw new Error("Method not implemented.");
  }
  getDataTable(firstRowIsHeader?: unknown): GoogleAppsScript.Charts.DataTable {
    throw new Error("Method not implemented.");
  }
  getDataValidation(): GoogleAppsScript.Spreadsheet.DataValidation | null {
    throw new Error("Method not implemented.");
  }
  getDataValidations(): Array<Array<GoogleAppsScript.Spreadsheet.DataValidation | null>> {
    throw new Error("Method not implemented.");
  }
  getDeveloperMetadata(): GoogleAppsScript.Spreadsheet.DeveloperMetadata[] {
    throw new Error("Method not implemented.");
  }
  getDisplayValue(): string {
    throw new Error("Method not implemented.");
  }
  getDisplayValues(): string[][] {
    throw new Error("Method not implemented.");
  }
  getFilter(): GoogleAppsScript.Spreadsheet.Filter | null {
    throw new Error("Method not implemented.");
  }
  getFontColor(): string {
    throw new Error("Method not implemented.");
  }
  getFontColors(): string[][] {
    throw new Error("Method not implemented.");
  }
  getFontColorObject(): GoogleAppsScript.Spreadsheet.Color {
    throw new Error("Method not implemented.");
  }
  getFontColorObjects(): GoogleAppsScript.Spreadsheet.Color[][] {
    throw new Error("Method not implemented.");
  }
  getFontFamilies(): string[][] {
    throw new Error("Method not implemented.");
  }
  getFontFamily(): string {
    throw new Error("Method not implemented.");
  }
  getFontLine(): GoogleAppsScript.Spreadsheet.FontLine {
    throw new Error("Method not implemented.");
  }
  getFontLines(): GoogleAppsScript.Spreadsheet.FontLine[][] {
    throw new Error("Method not implemented.");
  }
  getFontSize(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getFontSizes(): GoogleAppsScript.Integer[][] {
    throw new Error("Method not implemented.");
  }
  getFontStyle(): GoogleAppsScript.Spreadsheet.FontStyle {
    throw new Error("Method not implemented.");
  }
  getFontStyles(): GoogleAppsScript.Spreadsheet.FontStyle[][] {
    throw new Error("Method not implemented.");
  }
  getFontWeight(): GoogleAppsScript.Spreadsheet.FontWeight {
    throw new Error("Method not implemented.");
  }
  getFontWeights(): GoogleAppsScript.Spreadsheet.FontWeight[][] {
    throw new Error("Method not implemented.");
  }
  getFormula(): string {
    throw new Error("Method not implemented.");
  }
  getFormulaR1C1(): string | null {
    throw new Error("Method not implemented.");
  }
  getFormulas(): string[][] {
    throw new Error("Method not implemented.");
  }
  getFormulasR1C1(): Array<Array<string | null>> {
    throw new Error("Method not implemented.");
  }
  getGridId(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getHeight(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getHorizontalAlignment(): string {
    throw new Error("Method not implemented.");
  }
  getHorizontalAlignments(): string[][] {
    throw new Error("Method not implemented.");
  }
  getLastColumn(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getLastRow(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getMergedRanges(): GoogleAppsScript.Spreadsheet.Range[] {
    throw new Error("Method not implemented.");
  }
  getNextDataCell(
    direction: GoogleAppsScript.Spreadsheet.Direction,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  getNote(): string {
    throw new Error("Method not implemented.");
  }
  getNotes(): string[][] {
    throw new Error("Method not implemented.");
  }
  getNumColumns(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getNumRows(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getNumberFormat(): string {
    throw new Error("Method not implemented.");
  }
  getNumberFormats(): string[][] {
    throw new Error("Method not implemented.");
  }
  getRichTextValue(): GoogleAppsScript.Spreadsheet.RichTextValue | null {
    throw new Error("Method not implemented.");
  }
  getRichTextValues(): Array<Array<GoogleAppsScript.Spreadsheet.RichTextValue | null>> {
    throw new Error("Method not implemented.");
  }
  getRow(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getRowIndex(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    throw new Error("Method not implemented.");
  }
  getTextDirection(): GoogleAppsScript.Spreadsheet.TextDirection | null {
    throw new Error("Method not implemented.");
  }
  getTextDirections(): Array<Array<GoogleAppsScript.Spreadsheet.TextDirection | null>> {
    throw new Error("Method not implemented.");
  }
  getTextRotation(): GoogleAppsScript.Spreadsheet.TextRotation {
    throw new Error("Method not implemented.");
  }
  getTextRotations(): GoogleAppsScript.Spreadsheet.TextRotation[][] {
    throw new Error("Method not implemented.");
  }
  getTextStyle(): GoogleAppsScript.Spreadsheet.TextStyle {
    throw new Error("Method not implemented.");
  }
  getTextStyles(): GoogleAppsScript.Spreadsheet.TextStyle[][] {
    throw new Error("Method not implemented.");
  }
  getValue() {
    throw new Error("Method not implemented.");
  }
  getValues(): any[][] {
    throw new Error("Method not implemented.");
  }
  getVerticalAlignment(): string {
    throw new Error("Method not implemented.");
  }
  getVerticalAlignments(): string[][] {
    throw new Error("Method not implemented.");
  }
  getWidth(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getWrap(): boolean {
    throw new Error("Method not implemented.");
  }
  getWrapStrategies(): GoogleAppsScript.Spreadsheet.WrapStrategy[][] {
    throw new Error("Method not implemented.");
  }
  getWrapStrategy(): GoogleAppsScript.Spreadsheet.WrapStrategy {
    throw new Error("Method not implemented.");
  }
  getWraps(): boolean[][] {
    throw new Error("Method not implemented.");
  }
  insertCells(
    shiftDimension: GoogleAppsScript.Spreadsheet.Dimension,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  insertCheckboxes(
    checkedValue?: unknown,
    uncheckedValue?: unknown,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  isBlank(): boolean {
    throw new Error("Method not implemented.");
  }
  isChecked(): boolean | null {
    throw new Error("Method not implemented.");
  }
  isEndColumnBounded(): boolean {
    throw new Error("Method not implemented.");
  }
  isEndRowBounded(): boolean {
    throw new Error("Method not implemented.");
  }
  isPartOfMerge(): boolean {
    throw new Error("Method not implemented.");
  }
  isStartColumnBounded(): boolean {
    throw new Error("Method not implemented.");
  }
  isStartRowBounded(): boolean {
    throw new Error("Method not implemented.");
  }
  merge(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  mergeAcross(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  mergeVertically(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  moveTo(target: GoogleAppsScript.Spreadsheet.Range): void {
    throw new Error("Method not implemented.");
  }
  offset(
    rowOffset: unknown,
    columnOffset: unknown,
    numRows?: unknown,
    numColumns?: unknown,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  protect(): GoogleAppsScript.Spreadsheet.Protection {
    throw new Error("Method not implemented.");
  }
  randomize(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  removeCheckboxes(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  removeDuplicates(columnsToCompare?: unknown): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setBackground(color: string | null): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setBackgroundObject(
    color: GoogleAppsScript.Spreadsheet.Color | null,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setBackgroundObjects(
    color: GoogleAppsScript.Spreadsheet.Color[][] | null,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setBackgroundRGB(
    red: GoogleAppsScript.Integer,
    green: GoogleAppsScript.Integer,
    blue: GoogleAppsScript.Integer,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setBackgrounds(color: Array<Array<string | null>>): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setBorder(
    top: unknown,
    left: unknown,
    bottom: unknown,
    right: unknown,
    vertical: unknown,
    horizontal: unknown,
    color?: unknown,
    style?: unknown,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setDataValidation(
    rule: GoogleAppsScript.Spreadsheet.DataValidation | null,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setDataValidations(
    rules: Array<Array<GoogleAppsScript.Spreadsheet.DataValidation | null>>,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontColor(color: string | null): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontColorObject(
    color: GoogleAppsScript.Spreadsheet.Color | null,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontColorObjects(
    colors: Array<Array<GoogleAppsScript.Spreadsheet.Color | null>>,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontColors(colors: any[][]): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontFamilies(fontFamilies: Array<Array<string | null>>): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontFamily(fontFamily: string | null): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontLine(
    fontLine: GoogleAppsScript.Spreadsheet.FontLine | null,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontLines(
    fontLines: Array<Array<GoogleAppsScript.Spreadsheet.FontLine | null>>,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontSize(size: GoogleAppsScript.Integer): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontSizes(sizes: GoogleAppsScript.Integer[][]): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontStyle(
    fontStyle: GoogleAppsScript.Spreadsheet.FontStyle | null,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontStyles(
    fontStyles: Array<Array<GoogleAppsScript.Spreadsheet.FontStyle | null>>,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontWeight(
    fontWeight: GoogleAppsScript.Spreadsheet.FontWeight | null,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFontWeights(
    fontWeights: Array<Array<GoogleAppsScript.Spreadsheet.FontWeight | null>>,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFormula(formula: string): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFormulaR1C1(formula: string): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFormulas(formulas: string[][]): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setFormulasR1C1(formulas: string[][]): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setHorizontalAlignment(
    alignment: "left" | "center" | "normal" | "right" | null,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setHorizontalAlignments(
    alignments: Array<Array<"left" | "center" | "normal" | "right" | null>>,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setNote(note: string | null): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setNotes(notes: Array<Array<string | null>>): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setNumberFormat(numberFormat: string): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setNumberFormats(numberFormats: string[][]): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setRichTextValue(
    value: GoogleAppsScript.Spreadsheet.RichTextValue,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setRichTextValues(
    values: GoogleAppsScript.Spreadsheet.RichTextValue[][],
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setShowHyperlink(showHyperlink: boolean): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setTextDirection(
    direction: GoogleAppsScript.Spreadsheet.TextDirection | null,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setTextDirections(
    directions: Array<Array<GoogleAppsScript.Spreadsheet.TextDirection | null>>,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setTextRotation(rotation: unknown): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setTextRotations(
    rotations: GoogleAppsScript.Spreadsheet.TextRotation[][],
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setTextStyle(style: GoogleAppsScript.Spreadsheet.TextStyle): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setTextStyles(
    styles: GoogleAppsScript.Spreadsheet.TextStyle[][],
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setValue(value: any): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setValues(values: any[][]): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setVerticalAlignment(
    alignment: "top" | "middle" | "bottom" | null,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setVerticalAlignments(
    alignments: Array<Array<"top" | "middle" | "bottom" | null>>,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setVerticalText(isVertical: boolean): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setWrap(isWrapEnabled: boolean): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setWrapStrategies(
    strategies: GoogleAppsScript.Spreadsheet.WrapStrategy[][],
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setWrapStrategy(
    strategy: GoogleAppsScript.Spreadsheet.WrapStrategy,
  ): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  setWraps(isWrapEnabled: boolean[][]): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  shiftColumnGroupDepth(delta: GoogleAppsScript.Integer): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  shiftRowGroupDepth(delta: GoogleAppsScript.Integer): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  sort(sortSpecObj: any): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  splitTextToColumns(delimiter?: unknown): void {
    throw new Error("Method not implemented.");
  }
  trimWhitespace(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
  uncheck(): GoogleAppsScript.Spreadsheet.Range {
    throw new Error("Method not implemented.");
  }
}
