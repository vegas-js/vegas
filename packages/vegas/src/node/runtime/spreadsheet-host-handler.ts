import type { SpreadsheetHostCall, SpreadsheetHostCallResult } from "./spreadsheet-host-call";
import type { SpreadsheetStore } from "./spreadsheet-store";

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
      case "get-spreadsheet-metadata": {
        return this.#store.getSpreadsheetMetadata(call.spreadsheet);
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
      case "get-range-values": {
        return this.#store.getRangeValues(call.range);
      }
      case "set-range-values": {
        await this.#store.setRangeValues(call.range, call.values);
        return;
      }
    }
  }
}
