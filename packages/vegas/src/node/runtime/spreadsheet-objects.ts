import type { HostBridge } from "./host-bridge";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import { Range } from "./spreadsheet-range";
import type { SheetReference, SpreadsheetReference } from "./spreadsheet-reference";
import type { SpreadsheetCellValue } from "./spreadsheet-store";
import { assertInteger, assertPositiveInteger } from "./spreadsheet-validation";

export { Range };

type SpreadsheetFile = Pick<GoogleAppsScript.Drive.File, "getId">;

function extractSpreadsheetIdFromUrl(url: string): string {
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const spreadsheetsIndex = segments.indexOf("spreadsheets");
  const idMarkerIndex = segments.indexOf("d", spreadsheetsIndex + 1);
  const id = idMarkerIndex < 0 ? undefined : segments[idMarkerIndex + 1];

  if (parsed.hostname !== "docs.google.com" || spreadsheetsIndex < 0 || !id) {
    throw new Error("Invalid Spreadsheet URL.");
  }

  return id;
}

// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app
export class SpreadsheetApp {
  readonly #bridge: HostBridge;
  readonly #hydrator: SpreadsheetObjectHydrator;

  constructor(bridge: HostBridge, hydrator: SpreadsheetObjectHydrator) {
    this.#bridge = bridge;
    this.#hydrator = hydrator;
  }

  create(name: string, rows: number, columns: number): Spreadsheet {
    assertPositiveInteger(rows, "Spreadsheet rows");
    assertPositiveInteger(columns, "Spreadsheet columns");

    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "spreadsheet",
        operation: "create-spreadsheet",
        name,
        rows,
        columns,
      }),
    );
  }

  enableAllDataSourcesExecution(): void {
    return;
  }

  enableBigQueryExecution(): void {
    return;
  }

  enableLookerExecution(): void {
    return;
  }

  flush(): void {
    return;
  }

  open(file: SpreadsheetFile): Spreadsheet {
    return this.openById(file.getId());
  }

  openByUrl(url: string): Spreadsheet {
    return this.openById(extractSpreadsheetIdFromUrl(url));
  }

  openById(id: string): Spreadsheet {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "spreadsheet",
        operation: "get-spreadsheet",
        id,
      }),
    );
  }
}

// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet
export class Spreadsheet {
  readonly #bridge: HostBridge;
  readonly #reference: SpreadsheetReference;
  readonly #hydrator: SpreadsheetObjectHydrator;

  constructor(
    bridge: HostBridge,
    reference: SpreadsheetReference,
    hydrator: SpreadsheetObjectHydrator,
  ) {
    this.#bridge = bridge;
    this.#reference = reference;
    this.#hydrator = hydrator;
  }

  getId(): string {
    return this.#reference.id;
  }

  getName(): string {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "get-spreadsheet-metadata",
      spreadsheet: this.#reference,
    }).name;
  }

  getNumSheets(): number {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "list-sheets",
      spreadsheet: this.#reference,
    }).length;
  }

  getSheets(): Sheet[] {
    return this.#bridge
      .call({
        service: "spreadsheet",
        operation: "list-sheets",
        spreadsheet: this.#reference,
      })
      .map((reference) => this.#hydrator.hydrate(reference));
  }

  getSheetById(id: number): Sheet | null {
    assertInteger(id, "Spreadsheet sheet id");

    const reference = this.#bridge.call({
      service: "spreadsheet",
      operation: "get-sheet",
      spreadsheet: this.#reference,
      sheetId: id,
    });

    return reference === null ? null : this.#hydrator.hydrate(reference);
  }

  getSheetByName(name: string): Sheet | null {
    const reference = this.#bridge.call({
      service: "spreadsheet",
      operation: "get-sheet-by-name",
      spreadsheet: this.#reference,
      name,
    });

    return reference === null ? null : this.#hydrator.hydrate(reference);
  }

  rename(newName: string): void {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "rename-spreadsheet",
      spreadsheet: this.#reference,
      name: newName,
    });
  }
}

// https://developers.google.com/apps-script/reference/spreadsheet/sheet
export class Sheet {
  readonly #bridge: HostBridge;
  readonly #reference: SheetReference;
  readonly #hydrator: SpreadsheetObjectHydrator;

  constructor(bridge: HostBridge, reference: SheetReference, hydrator: SpreadsheetObjectHydrator) {
    this.#bridge = bridge;
    this.#reference = reference;
    this.#hydrator = hydrator;
  }

  clearContents(): Sheet {
    const bounds = this.#dataBounds();

    if (bounds.lastRow === null || bounds.lastColumn === null) {
      return this;
    }

    this.getRange(1, 1, bounds.lastRow, bounds.lastColumn).clearContent();

    return this;
  }

  getIndex(): number {
    const index = this.#bridge
      .call({
        service: "spreadsheet",
        operation: "list-sheets",
        spreadsheet: {
          service: "spreadsheet",
          kind: "spreadsheet",
          id: this.#reference.spreadsheetId,
        },
      })
      .findIndex(({ sheetId }) => sheetId === this.#reference.sheetId);

    if (index < 0) {
      throw new Error("Spreadsheet sheet is not present in its parent.");
    }

    return index + 1;
  }

  getMaxColumns(): number {
    return this.#metadata().maxColumns;
  }

  getMaxRows(): number {
    return this.#metadata().maxRows;
  }

  getName(): string {
    return this.#metadata().name;
  }

  hasHiddenGridlines(): boolean {
    return this.#metadata().hiddenGridlines;
  }

  getSheetName(): string {
    return this.getName();
  }

  setName(name: string): Sheet {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "rename-sheet",
      sheet: this.#reference,
      name,
    });

    return this;
  }

  isRightToLeft(): boolean {
    return this.#metadata().rightToLeft;
  }

  setHiddenGridlines(hideGridlines: boolean): Sheet {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-sheet-hidden-gridlines",
      sheet: this.#reference,
      hidden: hideGridlines,
    });

    return this;
  }

  setRightToLeft(rightToLeft: boolean): Sheet {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-sheet-right-to-left",
      sheet: this.#reference,
      rightToLeft,
    });

    return this;
  }

  getParent(): Spreadsheet {
    return this.#hydrator.hydrate({
      service: "spreadsheet",
      kind: "spreadsheet",
      id: this.#reference.spreadsheetId,
    });
  }

  getRange(row: number, column: number): Range;
  getRange(row: number, column: number, numRows: number): Range;
  getRange(row: number, column: number, numRows: number, numColumns: number): Range;
  getRange(row: number, column: number, numRows = 1, numColumns = 1): Range {
    assertPositiveInteger(row, "Spreadsheet range row");
    assertPositiveInteger(column, "Spreadsheet range column");
    assertPositiveInteger(numRows, "Spreadsheet range numRows");
    assertPositiveInteger(numColumns, "Spreadsheet range numColumns");

    return this.#hydrator.hydrate({
      service: "spreadsheet",
      kind: "range",
      spreadsheetId: this.#reference.spreadsheetId,
      sheetId: this.#reference.sheetId,
      row,
      column,
      numRows,
      numColumns,
    });
  }

  getSheetId(): number {
    return this.#reference.sheetId;
  }

  getSheetValues(
    startRow: number,
    startColumn: number,
    numRows: number,
    numColumns: number,
  ): SpreadsheetCellValue[][] {
    assertInteger(startRow, "Spreadsheet sheet startRow");
    assertInteger(startColumn, "Spreadsheet sheet startColumn");
    assertPositiveInteger(numRows, "Spreadsheet sheet numRows");
    assertPositiveInteger(numColumns, "Spreadsheet sheet numColumns");

    if (startRow === 0 || startRow < -1) {
      throw new RangeError("Spreadsheet sheet startRow must be -1 or a positive integer.");
    }
    if (startColumn === 0 || startColumn < -1) {
      throw new RangeError("Spreadsheet sheet startColumn must be -1 or a positive integer.");
    }

    let row = startRow;
    let column = startColumn;

    if (row === -1 || column === -1) {
      const bounds = this.#dataBounds();

      if (row === -1) {
        if (bounds.lastRow === null) {
          throw new RangeError("Spreadsheet sheet has no data row.");
        }
        row = bounds.lastRow;
      }
      if (column === -1) {
        if (bounds.lastColumn === null) {
          throw new RangeError("Spreadsheet sheet has no data column.");
        }
        column = bounds.lastColumn;
      }
    }

    return this.getRange(row, column, numRows, numColumns).getValues();
  }

  #dataBounds() {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "get-sheet-data-bounds",
      sheet: this.#reference,
    });
  }

  #metadata() {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "get-sheet-metadata",
      sheet: this.#reference,
    });
  }
}
