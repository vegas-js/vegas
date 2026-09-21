import type { SpreadsheetHostCall, SpreadsheetHostCallResult } from "./spreadsheet-host-call";
import type { SpreadsheetStore } from "./spreadsheet-store";
import { unsupportedHostCall } from "./unsupported-host-call";

export interface SpreadsheetHostCallHandler {
  handle(call: SpreadsheetHostCall): Promise<SpreadsheetHostCallResult<SpreadsheetHostCall>>;
}

export class SpreadsheetHostHandler implements SpreadsheetHostCallHandler {
  readonly #store: SpreadsheetStore;

  constructor(store: SpreadsheetStore) {
    this.#store = store;
  }

  async handle(call: SpreadsheetHostCall): Promise<SpreadsheetHostCallResult<SpreadsheetHostCall>> {
    switch (call.operation) {
      case "create-spreadsheet": {
        return this.#store.createSpreadsheet(call.name, call.rows, call.columns);
      }
      case "get-spreadsheet": {
        return this.#store.getSpreadsheet(call.id);
      }
      case "get-spreadsheet-by-url": {
        return this.#store.getSpreadsheetByUrl(call.url);
      }
      case "get-spreadsheet-metadata": {
        return this.#store.getSpreadsheetMetadata(call.spreadsheet);
      }
      case "rename-spreadsheet": {
        await this.#store.renameSpreadsheet(call.spreadsheet, call.name);
        return;
      }
      case "list-sheets": {
        return this.#store.listSheets(call.spreadsheet);
      }
      case "get-sheet": {
        return this.#store.getSheet(call.spreadsheet, call.sheetId);
      }
      case "get-sheet-by-name": {
        return this.#store.getSheetByName(call.spreadsheet, call.name);
      }
      case "get-sheet-metadata": {
        return this.#store.getSheetMetadata(call.sheet);
      }
      case "get-sheet-column-hidden-by-user": {
        return this.#store.isSheetColumnHiddenByUser(call.sheet, call.column);
      }
      case "get-sheet-row-hidden-by-user": {
        return this.#store.isSheetRowHiddenByUser(call.sheet, call.row);
      }
      case "rename-sheet": {
        await this.#store.renameSheet(call.sheet, call.name);
        return;
      }
      case "set-sheet-columns-hidden": {
        await this.#store.setSheetColumnsHidden(
          call.sheet,
          call.startColumn,
          call.numColumns,
          call.hidden,
        );
        return;
      }
      case "set-sheet-rows-hidden": {
        await this.#store.setSheetRowsHidden(call.sheet, call.startRow, call.numRows, call.hidden);
        return;
      }
      case "set-sheet-frozen-columns": {
        await this.#store.setSheetFrozenColumns(call.sheet, call.columns);
        return;
      }
      case "set-sheet-frozen-rows": {
        await this.#store.setSheetFrozenRows(call.sheet, call.rows);
        return;
      }
      case "set-sheet-hidden": {
        await this.#store.setSheetHidden(call.sheet, call.hidden);
        return;
      }
      case "set-sheet-hidden-gridlines": {
        await this.#store.setSheetHiddenGridlines(call.sheet, call.hidden);
        return;
      }
      case "set-sheet-right-to-left": {
        await this.#store.setSheetRightToLeft(call.sheet, call.rightToLeft);
        return;
      }
      case "set-sheet-tab-color": {
        await this.#store.setSheetTabColor(call.sheet, call.tabColor);
        return;
      }
      case "clear-sheet-notes": {
        await this.#store.clearSheetNotes(call.sheet);
        return;
      }
      case "get-sheet-data-bounds": {
        return this.#store.getSheetDataBounds(call.sheet);
      }
      case "get-range-notes": {
        return this.#store.getRangeNotes(call.range);
      }
      case "get-range-values": {
        return this.#store.getRangeValues(call.range);
      }
      case "set-range-notes": {
        await this.#store.setRangeNotes(call.range, call.notes);
        return;
      }
      case "set-range-values": {
        await this.#store.setRangeValues(call.range, call.values);
        return;
      }
    }

    return unsupportedHostCall(call);
  }
}
