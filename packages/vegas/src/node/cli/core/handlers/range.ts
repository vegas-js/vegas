import type { RuntimeServiceImplementation } from "../../../runtime/protocol";
import type { ServeContext } from "../context";

export class RangeHandler implements RuntimeServiceImplementation<"Range"> {
  readonly #context: ServeContext;

  constructor(context: ServeContext) {
    this.#context = context;
  }

  #getSheet(spreadsheetId: string, sheetId: number) {
    const spreadsheet = this.#context.store.spreadsheet.get(spreadsheetId);

    if (!spreadsheet) {
      throw new Error(`Spreadsheet not found: ${spreadsheetId}`);
    }

    const sheet = spreadsheet.sheets.get(sheetId);

    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetId}`);
    }

    return sheet;
  }

  getValue(payload: {
    spreadsheetId: string;
    sheetId: number;
    range: { row: number; column: number };
  }) {
    const sheet = this.#getSheet(payload.spreadsheetId, payload.sheetId);
    return sheet.cells[payload.range.row - 1][payload.range.column - 1];
  }
  getValues(payload: {
    spreadsheetId: string;
    sheetId: number;
    range: { row: number; column: number; numRows: number; numColumns: number };
  }) {
    const sheet = this.#getSheet(payload.spreadsheetId, payload.sheetId);
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
  setValue(payload: {
    spreadsheetId: string;
    sheetId: number;
    range: { row: number; column: number; numRows: number; numColumns: number };
    value: any;
  }) {
    const sheet = this.#getSheet(payload.spreadsheetId, payload.sheetId);
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
  setValues(payload: {
    spreadsheetId: string;
    sheetId: number;
    range: { row: number; column: number; numRows: number; numColumns: number };
    values: any[][];
  }) {
    const sheet = this.#getSheet(payload.spreadsheetId, payload.sheetId);
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
