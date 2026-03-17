import { ServeContext } from "../context";

export class SheetHandler {
  deleteRow(
    ctx: ServeContext,
    payload: { spreadsheetId: string; sheetId: number; rowPosition: number },
  ) {
    this.deleteRows(ctx, {
      spreadsheetId: payload.spreadsheetId,
      sheetId: payload.sheetId,
      rowPosition: payload.rowPosition,
      howMany: 1,
    });
  }
  deleteRows(
    ctx: ServeContext,
    payload: { spreadsheetId: string; sheetId: number; rowPosition: number; howMany: number },
  ) {
    ctx.store.spreadsheet
      .get(payload.spreadsheetId)
      ?.sheets.get(payload.sheetId)
      ?.cells.splice(payload.rowPosition, payload.howMany);
  }
  deleteColumn(
    ctx: ServeContext,
    payload: { spreadsheetId: string; sheetId: number; columnPosition: number },
  ) {
    this.deleteColumns(ctx, {
      spreadsheetId: payload.spreadsheetId,
      sheetId: payload.sheetId,
      columnPosition: payload.columnPosition,
      howMany: 1,
    });
  }
  deleteColumns(
    ctx: ServeContext,
    payload: { spreadsheetId: string; sheetId: number; columnPosition: number; howMany: number },
  ) {
    ctx.store.spreadsheet
      .get(payload.spreadsheetId)
      ?.sheets.get(payload.sheetId)
      ?.cells.forEach((row) => row.splice(payload.columnPosition, payload.howMany));
  }
  getLastColumn(ctx: ServeContext, payload: { spreadsheetId: string; sheetId: number }) {
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
    for (let j = cells[0].length - 1; j >= 0; j--) {
      for (let i = 0; i < cells.length; i++) {
        if (cells[i][j] !== "") {
          return j + 1;
        }
      }
    }
    return 0;
  }
  getLastRow(ctx: ServeContext, payload: { spreadsheetId: string; sheetId: number }) {
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
    for (let i = cells.length - 1; i >= 0; i--) {
      for (let j = 0; j < cells[0].length; j++) {
        if (cells[i][j] !== "") {
          return i + 1;
        }
      }
    }
    return 0;
  }
  getMaxColumns(ctx: ServeContext, payload: { spreadsheetId: string; sheetId: number }) {
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
    return sheet.cells[0].length;
  }
  getMaxRows(ctx: ServeContext, payload: { spreadsheetId: string; sheetId: number }) {
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
    return sheet.cells.length;
  }
  getRange(ctx: ServeContext, payload: { spreadsheetId: string; sheetName: string }) {
    const spreadSheet = ctx.store.spreadsheet.get(payload.spreadsheetId);
    if (!spreadSheet) {
      return null;
    }
    const sheets = spreadSheet.sheets;
    if (!sheets) {
      return null;
    }
    for (const [sheetId, sheet] of sheets) {
      if (sheet.name === payload.sheetName) {
        return sheetId;
      }
    }
  }
  getSheetName(ctx: ServeContext, payload: { spreadsheetId: string; sheetId: number }) {
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
    return sheet.name;
  }
}
