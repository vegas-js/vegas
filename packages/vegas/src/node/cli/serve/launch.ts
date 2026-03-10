import path from "node:path";
import worker from "node:worker_threads";

import { Scope } from "../../worker/gas";
import { ServeContext } from "./context";

class HtmlServiceHandler {
  createHtmlOutputFromFile(ctx: ServeContext, payload: any) {
    const filePath = `${path.parse(payload).name}.html`;
    const html = ctx.code.web.map.get(filePath);
    return html;
  }
}

class SessionHandler {
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

class CacheHandler {
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
    return cache ? cache[payload.key].value : null;
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

class PropertiesHandler {
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

class SpreadsheetAppHandler {
  create(ctx: ServeContext, payload: { name: string; rows: number; columns: number }) {
    let id = "";
    do {
      String.fromCharCode(
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
      Array.from({ length: payload.columns }).map(() => null),
    );
    const sheet = new Map<number, { name: string; cells: any[][] }>();
    sheet.set(0, { name: "sheet1", cells });
    ctx.store.spreadsheet.set(id, { name: payload.name, sheet: new Map() });

    return id;
  }
  openById(ctx: ServeContext, payload: { id: string }) {
    return ctx.store.spreadsheet.get(payload.id)?.name ?? null;
  }
}

class SheetHandler {
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
      ?.sheet.get(payload.sheetId)
      ?.cells.splice(payload.rowPosition, payload.howMany);
  }
  deleteColumn(
    ctx: ServeContext,
    payload: { spreadsheetId: string; sheetId: number; columnPosition: number },
  ) {
    this.deleteRows(ctx, {
      spreadsheetId: payload.spreadsheetId,
      sheetId: payload.sheetId,
      rowPosition: payload.columnPosition,
      howMany: 1,
    });
  }
  deleteColumns(
    ctx: ServeContext,
    payload: { spreadsheetId: string; sheetId: number; columnPosition: number; howMany: number },
  ) {
    ctx.store.spreadsheet
      .get(payload.spreadsheetId)
      ?.sheet.get(payload.sheetId)
      ?.cells.forEach((row) => row.splice(payload.columnPosition, payload.howMany));
  }
}

class GASHandler {
  constructor() {
    const proxyHandler: ProxyHandler<any> = {
      get(target, property, receiver) {
        const thisFn = Reflect.get(target, property, receiver);
        if (thisFn) {
          return thisFn;
        }
        return (port: worker.MessagePort, sharedArray: Int32Array, ...args: any[]) => {
          const [clazz, method] = property.toString().split("#");
          try {
            const result = target[clazz][method](...args);
            if (result !== undefined) {
              port.postMessage(result);
            }
          } finally {
            Atomics.store(sharedArray, 0, 0);
            Atomics.notify(sharedArray, 0);
          }
        };
      },
    };

    return new Proxy(this, proxyHandler);
  }

  addHandler(HandlerClass: new () => any) {
    const className = HandlerClass.name;
    if (typeof HandlerClass === "function" && className.endsWith("Handler")) {
      const key = className.replace(/Handler$/, "");
      (this as any)[key] = new HandlerClass();
    }
  }
}

const handler = new GASHandler();
handler.addHandler(HtmlServiceHandler);
handler.addHandler(SessionHandler);
handler.addHandler(CacheHandler);
handler.addHandler(PropertiesHandler);
handler.addHandler(SpreadsheetAppHandler);
handler.addHandler(SheetHandler);

export function launchGAS(ctx: ServeContext, fn: string, ...args: any[]): Promise<any> {
  return new Promise((resolve) => {
    const sharedBuffer = new SharedArrayBuffer(4);
    const sharedArray = new Int32Array(sharedBuffer);
    const { port1, port2 } = new worker.MessageChannel();
    new worker.Worker(path.join(import.meta.dirname, "gas.js"), {
      env: { ...process.env, FORCE_COLOR: "1" },
      transferList: [port2],
      workerData: { code: ctx.code.server, sharedArray, port: port2 },
    });

    port1.postMessage({ fn, args });
    port1.on("message", (data) => {
      if (data.message === "resolve") {
        port1.close();
        resolve(data.payload);
      } else {
        (handler as any)[data.message](port1, sharedArray, ctx, data.payload);
      }
    });
  });
}
