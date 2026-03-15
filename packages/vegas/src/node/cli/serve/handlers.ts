import path from "node:path";

import { Scope } from "../../worker/gas";
import { ServeContext } from "./context";

export class HtmlServiceHandler {
  createHtmlOutputFromFile(ctx: ServeContext, payload: any) {
    const filePath = `${path.parse(payload).name}.html`;
    const html = ctx.code.web.map.get(filePath);
    return html;
  }
}

export class SessionHandler {
  getActiveUser(ctx: ServeContext) {
    const email =
      ctx.config.gas.webapp!.executeAs === "USER_ACCESSING"
        ? (ctx.mock["Session"]?.activeUserEmail ?? "active@gmail.com")
        : (ctx.mock["Session"]?.effectiveUserEmail ?? "effective@gmail.com");
    return email;
  }
  getActiveUserLocale(ctx: ServeContext) {
    const userLocale = ctx.mock["Session"]?.activeUserLocale ?? "en";
    return userLocale;
  }
  getEffectiveUser(ctx: ServeContext) {
    const email =
      ctx.config.gas.webapp!.executeAs === "USER_ACCESSING"
        ? (ctx.mock["Session"]?.activeUserEmail ?? "active@gmail.com")
        : (ctx.mock["Session"]?.effectiveUserEmail ?? "effective@gmail.com");
    return email;
  }
  getScriptTimeZone(ctx: ServeContext) {
    const timeZone = ctx.config.gas.timeZone ?? "UTC";
    return timeZone;
  }
  getTemporaryActiveUserKey(ctx: ServeContext) {
    const key =
      ctx.mock["Session"]?.temporaryActiveUserKey ??
      "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    return key;
  }
}

export class CacheHandler {
  #getScopedCache(scope: Scope, ctx: ServeContext) {
    switch (scope) {
      case "document": {
        return ctx.store.cache.document;
      }
      case "script": {
        return ctx.store.cache.script;
      }
      case "user": {
        return ctx.store.cache.user;
      }
      default: {
        return null;
      }
    }
  }

  #deleteExpiredCache(
    cache: Record<
      string,
      {
        value: string;
        expired: number;
      }
    >,
  ) {
    const now = Date.now();
    Object.entries(cache).forEach(([key, data]) => {
      if (data.expired <= now) {
        delete cache[key];
      }
    });
  }

  #deleteOverflowCache(
    cache: Record<
      string,
      {
        value: string;
        expired: number;
      }
    >,
  ) {
    const cachedLength = Object.keys(cache).length;
    if (cachedLength > 1000) {
      const objArray: { expired: number; key: string }[] = [];
      Object.entries(cache).forEach(([key, data]) => {
        objArray.push({ expired: data.expired, key });
      });
      // asc sort
      objArray.sort((a, b) => a.expired - b.expired);
      // remove cached value ( result 900 cache values )
      for (let i = 0; i < 100 + cachedLength - 1000; i++) {
        delete cache[objArray[i].key];
      }
    }
  }
  get(ctx: ServeContext, payload: any) {
    const cache = this.#getScopedCache(payload.scope, ctx);

    if (cache) {
      this.#deleteExpiredCache(cache);
    }
    return cache ? cache[payload.key]?.value : null;
  }
  getAll(ctx: ServeContext, payload: any) {
    const cache = this.#getScopedCache(payload.scope, ctx);

    const obj: Record<string, string> = {};
    if (cache) {
      this.#deleteExpiredCache(cache);
      Object.entries(cache).forEach(([key, value]) => {
        if ((payload.keys as string[]).includes(key)) {
          obj[key] = value.value;
        }
      });
    }
    return obj;
  }
  put(ctx: ServeContext, payload: any) {
    const cache = this.#getScopedCache(payload.scope, ctx);

    if (cache) {
      const record = payload.record;
      cache[record.key] = { value: record.value, expired: record.expired };

      this.#deleteOverflowCache(cache);
    }
  }
  putAll(ctx: ServeContext, payload: any) {
    const cache = this.#getScopedCache(payload.scope, ctx);

    if (cache) {
      const expired = payload.record.expired;
      Object.entries(payload.record.values as Record<string, string>).forEach(([key, value]) => {
        cache[key] = { value, expired };
      });

      this.#deleteOverflowCache(cache);
    }
  }
  remove(ctx: ServeContext, payload: any) {
    const cache = this.#getScopedCache(payload.scope, ctx);

    if (cache) {
      delete cache[payload.key];
    }
  }
  removeAll(ctx: ServeContext, payload: any) {
    const cache = this.#getScopedCache(payload.scope, ctx);

    if (cache) {
      (payload.keys as string[]).forEach((key) => {
        delete cache[key];
      });
    }
  }
}

export class PropertiesHandler {
  #getScopedProperties(scope: Scope, ctx: ServeContext) {
    switch (scope) {
      case "document": {
        return ctx.store.properties.document;
      }
      case "script": {
        return ctx.store.properties.script;
      }
      case "user": {
        return ctx.store.properties.user;
      }
      default: {
        return null;
      }
    }
  }

  deleteAllProperties(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    if (property) {
      Object.keys(property).forEach((key) => {
        delete property[key];
      });
    }
  }
  deleteProperty(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    if (property) {
      delete property[payload.key];
    }
  }
  getKeys(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    return Object.keys(property ?? {});
  }
  getProperties(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    const obj: Record<string, string> = {};
    if (property) {
      Object.keys(property).forEach((key) => {
        obj[key] = property[key];
      });
    }
    return obj;
  }
  getProperty(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    return property ? property[payload.key] : null;
  }
  setProperties(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    if (property) {
      if (payload.deleteAllOthers) {
        Object.keys(property).forEach((key) => {
          delete property[key];
        });
      }

      Object.keys(payload.properties).forEach((key) => {
        property[key] = payload.properties[key];
      });
    }
  }
  setProperty(ctx: ServeContext, payload: any) {
    const property = this.#getScopedProperties(payload.scope, ctx);

    if (property) {
      property[payload.property.key] = payload.property.value;
    }
  }
}

export class SpreadsheetAppHandler {
  create(ctx: ServeContext, payload: { name: string; rows: number; columns: number }) {
    let id = "";
    do {
      id = String.fromCharCode(
        ...Array.from({ length: 44 }).map(() => {
          let tempId = Math.floor(Math.random() * 61) + 0x2d;
          if (tempId > 0x2d) {
            tempId += 3;
          }
          if (tempId > 0x39) {
            tempId += 7;
          }
          if (tempId > 0x5a) {
            tempId += 6;
          }

          return tempId;
        }),
      );
    } while (ctx.store.spreadsheet.has(id));

    const cells: any[][] = Array.from({ length: payload.rows }).map(() =>
      Array.from({ length: payload.columns }).map(() => ""),
    );
    const sheets = new Map<number, { name: string; cells: any[][] }>();
    sheets.set(0, { name: "sheet1", cells });
    ctx.store.spreadsheet.set(id, { name: payload.name, sheets });

    return id;
  }
  openById(ctx: ServeContext, payload: { id: string }) {
    return ctx.store.spreadsheet.get(payload.id)?.name ?? null;
  }
}

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
}

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
    const rowEnd = payload.range.numRows === 0 ? cells.length - 1 : payload.range.numRows;
    const rows = cells.slice(rowStart, rowEnd);

    const columnStart = payload.range.numColumns === 0 ? 0 : payload.range.column - 1;
    const columnEnd =
      payload.range.numColumns === 0 ? cells[0].length - 1 : payload.range.numColumns;
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
    const rowEnd = payload.range.numRows === 0 ? cells.length - 1 : payload.range.numRows;
    const columnStart = payload.range.numColumns === 0 ? 0 : payload.range.column - 1;
    const columnEnd =
      payload.range.numColumns === 0 ? cells[0].length - 1 : payload.range.numColumns;
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
    const rowEnd = payload.range.numRows === 0 ? cells.length - 1 : payload.range.numRows;
    const columnStart = payload.range.numColumns === 0 ? 0 : payload.range.column - 1;
    const columnEnd =
      payload.range.numColumns === 0 ? cells[0].length - 1 : payload.range.numColumns;
    for (let i = rowStart; i < rowEnd; i++) {
      for (let j = columnStart; j < columnEnd; j++) {
        cells[i][j] = payload.values[i][j];
      }
    }
  }
}
