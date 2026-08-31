import type { RuntimeServiceImplementation } from "../../protocol";
import type { SpreadsheetStore } from "./range";

export class SheetHandler implements RuntimeServiceImplementation<"Sheet"> {
  readonly #store: SpreadsheetStore;

  constructor(store: SpreadsheetStore) {
    this.#store = store;
  }

  getLastColumn(payload: { spreadsheetId: string; sheetId: number }) {
    const spreadSheet = this.#store.get(payload.spreadsheetId);
    if (!spreadSheet) {
      return null;
    }
    const sheets = spreadSheet.sheets;
    if (!sheets) {
      return null;
    }
    const sheet = sheets.get(payload.sheetId);
    if (!sheet) {
      return null;
    }
    const cells = sheet.cells;
    for (let j = cells[0].length - 1; j >= 0; j--) {
      for (let i = 0; i < cells.length; i++) {
        if (cells[i][j] !== "") {
          return j + 1;
        }
      }
    }
    return 0;
  }
  getLastRow(payload: { spreadsheetId: string; sheetId: number }) {
    const spreadSheet = this.#store.get(payload.spreadsheetId);
    if (!spreadSheet) {
      return null;
    }
    const sheets = spreadSheet.sheets;
    if (!sheets) {
      return null;
    }
    const sheet = sheets.get(payload.sheetId);
    if (!sheet) {
      return null;
    }
    const cells = sheet.cells;
    for (let i = cells.length - 1; i >= 0; i--) {
      for (let j = 0; j < cells[0].length; j++) {
        if (cells[i][j] !== "") {
          return i + 1;
        }
      }
    }
    return 0;
  }
  getMaxColumns(payload: { spreadsheetId: string; sheetId: number }) {
    const spreadSheet = this.#store.get(payload.spreadsheetId);
    if (!spreadSheet) {
      return null;
    }
    const sheets = spreadSheet.sheets;
    if (!sheets) {
      return null;
    }
    const sheet = sheets.get(payload.sheetId);
    if (!sheet) {
      return null;
    }
    return sheet.cells[0].length;
  }
  getMaxRows(payload: { spreadsheetId: string; sheetId: number }) {
    const spreadSheet = this.#store.get(payload.spreadsheetId);
    if (!spreadSheet) {
      return null;
    }
    const sheets = spreadSheet.sheets;
    if (!sheets) {
      return null;
    }
    const sheet = sheets.get(payload.sheetId);
    if (!sheet) {
      return null;
    }
    return sheet.cells.length;
  }
  getSheetName(payload: { spreadsheetId: string; sheetId: number }) {
    const spreadSheet = this.#store.get(payload.spreadsheetId);
    if (!spreadSheet) {
      return null;
    }
    const sheets = spreadSheet.sheets;
    if (!sheets) {
      return null;
    }
    const sheet = sheets.get(payload.sheetId);
    if (!sheet) {
      return null;
    }
    return sheet.name;
  }
}
