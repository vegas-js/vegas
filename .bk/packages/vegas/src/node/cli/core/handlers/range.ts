import { ServeContext } from "../context";

export class RangeHandler {
  getValue(
    ctx: ServeContext,
    payload: { spreadsheetId: string; sheetId: number; range: { row: number; column: number } },
  ) {
    const spreadSheet = ctx.store.spreadsheet.get(payload.spreadsheetId);
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
    return sheet.cells[payload.range.row - 1][payload.range.column - 1];
  }
  getValues(
    ctx: ServeContext,
    payload: {
      spreadsheetId: string;
      sheetId: number;
      range: { row: number; column: number; numRows: number; numColumns: number };
    },
  ) {
    const spreadSheet = ctx.store.spreadsheet.get(payload.spreadsheetId);
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
    const rowStart = payload.range.numRows === 0 ? 0 : payload.range.row - 1;
    const rowEnd = payload.range.numRows === 0 ? cells.length : rowStart + payload.range.numRows;
    const rows = cells.slice(rowStart, rowEnd);

    const columnStart = payload.range.numColumns === 0 ? 0 : payload.range.column - 1;
    const columnEnd =
      payload.range.numColumns === 0 ? cells[0].length : columnStart + payload.range.numColumns;
    return rows.map((arr) => {
      return arr.slice(columnStart, columnEnd);
    });
  }
  setValue(
    ctx: ServeContext,
    payload: {
      spreadsheetId: string;
      sheetId: number;
      range: { row: number; column: number; numRows: number; numColumns: number };
      value: any;
    },
  ) {
    const spreadSheet = ctx.store.spreadsheet.get(payload.spreadsheetId);
    if (!spreadSheet) {
      return;
    }
    const sheets = spreadSheet.sheets;
    if (!sheets) {
      return;
    }
    const sheet = sheets.get(payload.sheetId);
    if (!sheet) {
      return;
    }
    const cells = sheet.cells;
    const rowStart = payload.range.numRows === 0 ? 0 : payload.range.row - 1;
    const rowEnd = payload.range.numRows === 0 ? cells.length : rowStart + payload.range.numRows;
    const columnStart = payload.range.numColumns === 0 ? 0 : payload.range.column - 1;
    const columnEnd =
      payload.range.numColumns === 0 ? cells[0].length : columnStart + payload.range.numColumns;
    for (let i = rowStart; i < rowEnd; i++) {
      for (let j = columnStart; j < columnEnd; j++) {
        cells[i][j] = payload.value;
      }
    }
  }
  setValues(
    ctx: ServeContext,
    payload: {
      spreadsheetId: string;
      sheetId: number;
      range: { row: number; column: number; numRows: number; numColumns: number };
      values: any[][];
    },
  ) {
    const spreadSheet = ctx.store.spreadsheet.get(payload.spreadsheetId);
    if (!spreadSheet) {
      return;
    }
    const sheets = spreadSheet.sheets;
    if (!sheets) {
      return;
    }
    const sheet = sheets.get(payload.sheetId);
    if (!sheet) {
      return;
    }
    const cells = sheet.cells;
    const rowStart = payload.range.numRows === 0 ? 0 : payload.range.row - 1;
    const rowEnd = payload.range.numRows === 0 ? cells.length : rowStart + payload.range.numRows;
    const columnStart = payload.range.numColumns === 0 ? 0 : payload.range.column - 1;
    const columnEnd =
      payload.range.numColumns === 0 ? cells[0].length : columnStart + payload.range.numColumns;
    for (let i = rowStart; i < rowEnd; i++) {
      for (let j = columnStart; j < columnEnd; j++) {
        cells[i][j] = payload.values[i - rowStart][j - columnStart];
      }
    }
  }
}
