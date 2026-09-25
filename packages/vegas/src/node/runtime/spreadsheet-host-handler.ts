import type { SpreadsheetHostCall, SpreadsheetHostCallResult } from "./spreadsheet-host-call";
import type { SpreadsheetStore } from "./spreadsheet-store";
import type { SpreadsheetUrlCapability } from "./spreadsheet-url-capability";
import { unsupportedHostCall } from "./unsupported-host-call";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

export interface SpreadsheetHostCallHandler {
  handle(call: SpreadsheetHostCall): Promise<SpreadsheetHostCallResult<SpreadsheetHostCall>>;
}

export class SpreadsheetHostHandler implements SpreadsheetHostCallHandler {
  readonly #store: SpreadsheetStore;
  readonly #urls: SpreadsheetUrlCapability | undefined;

  constructor(store: SpreadsheetStore, urls?: SpreadsheetUrlCapability) {
    this.#store = store;
    this.#urls = urls;
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
        const localId = this.#urls?.getSpreadsheetIdByUrl(call.url);

        return localId === undefined
          ? this.#store.getSpreadsheetByUrl(call.url)
          : this.#store.getSpreadsheet(localId);
      }
      case "get-spreadsheet-url": {
        if (this.#urls === undefined) {
          // Google defines Spreadsheet.getUrl(), but not Vegas local URL mapping. Vegas requires
          // an explicit URL capability instead of inventing a production-like Spreadsheet URL.
          throw new UnsupportedRuntimeOperationError(
            "Spreadsheet.getUrl()",
            "local Spreadsheet URLs require a URL capability.",
          );
        }

        return this.#urls.getSpreadsheetUrl(call.spreadsheet);
      }
      case "get-spreadsheet-metadata": {
        return this.#store.getSpreadsheetMetadata(call.spreadsheet);
      }
      case "get-spreadsheet-locale": {
        return this.#store.getSpreadsheetLocale(call.spreadsheet);
      }
      case "get-spreadsheet-time-zone": {
        return this.#store.getSpreadsheetTimeZone(call.spreadsheet);
      }
      case "rename-spreadsheet": {
        await this.#store.renameSpreadsheet(call.spreadsheet, call.name);
        return;
      }
      case "set-spreadsheet-locale": {
        await this.#store.setSpreadsheetLocale(call.spreadsheet, call.locale);
        return;
      }
      case "set-spreadsheet-time-zone": {
        await this.#store.setSpreadsheetTimeZone(call.spreadsheet, call.timeZone);
        return;
      }
      case "list-sheets": {
        return this.#store.listSheets(call.spreadsheet);
      }
      case "delete-sheet": {
        if (call.sheet.spreadsheetId !== call.spreadsheet.id) {
          // Google documents deleting a Sheet from a Spreadsheet but does not define passing a
          // Sheet owned by another Spreadsheet. Vegas rejects mismatched local references instead
          // of risking deletion of an unrelated Sheet with the same numeric id.
          throw new Error("Spreadsheet.deleteSheet() requires a Sheet from the same Spreadsheet.");
        }

        await this.#store.deleteSheet(call.sheet);
        return;
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
      case "delete-sheet-columns": {
        await this.#store.deleteSheetColumns(call.sheet, call.startColumn, call.numColumns);
        return;
      }
      case "delete-sheet-rows": {
        await this.#store.deleteSheetRows(call.sheet, call.startRow, call.numRows);
        return;
      }
      case "insert-sheet-columns": {
        await this.#store.insertSheetColumns(call.sheet, call.startColumn, call.numColumns);
        return;
      }
      case "insert-sheet-rows": {
        await this.#store.insertSheetRows(call.sheet, call.startRow, call.numRows);
        return;
      }
      case "move-sheet-columns": {
        await this.#store.moveSheetColumns(
          call.sheet,
          call.sourceStart,
          call.sourceCount,
          call.destinationIndex,
        );
        return;
      }
      case "move-sheet-rows": {
        await this.#store.moveSheetRows(
          call.sheet,
          call.sourceStart,
          call.sourceCount,
          call.destinationIndex,
        );
        return;
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
