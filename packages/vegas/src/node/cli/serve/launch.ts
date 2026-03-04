import path from "node:path";
import worker from "node:worker_threads";

import { ServeContext } from "./context";

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
    port1.on("message", async (data) => {
      if (data.message === "vegas:HtmlService#createHtmlOutputFromFile") {
        const filePath = `${path.parse(data.payload).name}.html`;
        const html = ctx.code.web.map.get(filePath);
        port1.postMessage(html);
        Atomics.store(sharedArray, 0, 0);
        Atomics.notify(sharedArray, 0);
      } else if (data.message === "vegas:Session#getActiveUser") {
        const email =
          ctx.config.gas.webapp!.executeAs === "USER_ACCESSING"
            ? (ctx.mock["Session"]?.activeUserEmail ?? "active@gmail.com")
            : (ctx.mock["Session"]?.effectiveUserEmail ?? "effective@gmail.com");
        port1.postMessage(email);
        Atomics.store(sharedArray, 0, 0);
        Atomics.notify(sharedArray, 0);
      } else if (data.message === "vegas:Session#getActiveUserLocale") {
        const userLocale = ctx.mock["Session"]?.activeUserLocale ?? "en";
        port1.postMessage(userLocale);
        Atomics.store(sharedArray, 0, 0);
        Atomics.notify(sharedArray, 0);
      } else if (data.message === "vegas:Session#getEffectiveUser") {
        const email =
          ctx.config.gas.webapp!.executeAs === "USER_ACCESSING"
            ? (ctx.mock["Session"]?.activeUserEmail ?? "active@gmail.com")
            : (ctx.mock["Session"]?.effectiveUserEmail ?? "effective@gmail.com");
        port1.postMessage(email);
        Atomics.store(sharedArray, 0, 0);
        Atomics.notify(sharedArray, 0);
      } else if (data.message === "vegas:Session#getScriptTimeZone") {
        const timeZone = ctx.config.gas.timeZone ?? "UTC";
        port1.postMessage(timeZone);
        Atomics.store(sharedArray, 0, 0);
        Atomics.notify(sharedArray, 0);
      } else if (data.message === "vegas:Session#getTemporaryActiveUserKey") {
        const key =
          ctx.mock["Session"]?.temporaryActiveUserKey ??
          "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
        port1.postMessage(key);
        Atomics.store(sharedArray, 0, 0);
        Atomics.notify(sharedArray, 0);
      } else if (data.message === "vegas:Cache#get") {
        let cache = null;
        if (data.payload.scope === "document") {
          cache = ctx.store.cache.document;
        } else if (data.payload.scope === "script") {
          cache = ctx.store.cache.script;
        } else if (data.payload.scope === "user") {
          cache = ctx.store.cache.user;
        }

        if (cache) {
          const now = Date.now();
          Object.entries(cache).forEach(([key, data]) => {
            if (data.expired <= now) {
              delete cache[key];
            }
          });
          port1.postMessage(cache[data.payload.key].value);
        }
        Atomics.store(sharedArray, 0, 0);
        Atomics.notify(sharedArray, 0);
      } else if (data.message === "vegas:Cache#getAll") {
        let cache = null;
        if (data.payload.scope === "document") {
          cache = ctx.store.cache.document;
        } else if (data.payload.scope === "script") {
          cache = ctx.store.cache.script;
        } else if (data.payload.scope === "user") {
          cache = ctx.store.cache.user;
        }

        if (cache) {
          const now = Date.now();
          const obj: Record<string, string> = {};
          Object.entries(cache).forEach(([key, value]) => {
            if (value.expired <= now) {
              delete cache[key];
            } else if ((data.payload.keys as string[]).includes(key)) {
              obj[key] = cache[key].value;
            }
          });
          port1.postMessage(obj);
        }
        Atomics.store(sharedArray, 0, 0);
        Atomics.notify(sharedArray, 0);
      } else if (data.message === "vegas:Cache#put") {
        let cache = null;
        if (data.payload.scope === "document") {
          cache = ctx.store.cache.document;
        } else if (data.payload.scope === "script") {
          cache = ctx.store.cache.script;
        } else if (data.payload.scope === "user") {
          cache = ctx.store.cache.user;
        }

        if (cache) {
          const record = data.payload.record;
          cache[record.key] = { value: record.value, expired: record.expired };

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
        Atomics.store(sharedArray, 0, 0);
        Atomics.notify(sharedArray, 0);
      } else if (data.message === "vegas:Cache#putAll") {
        let cache = null;
        if (data.payload.scope === "document") {
          cache = ctx.store.cache.document;
        } else if (data.payload.scope === "script") {
          cache = ctx.store.cache.script;
        } else if (data.payload.scope === "user") {
          cache = ctx.store.cache.user;
        }

        if (cache) {
          const expired = data.payload.record.expired;
          Object.entries(data.payload.record.values as Record<string, string>).forEach(
            ([key, value]) => {
              cache[key] = { value, expired };
            },
          );

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
        Atomics.store(sharedArray, 0, 0);
        Atomics.notify(sharedArray, 0);
      } else if (data.message === "vegas:Cache#remove") {
        let cache = null;
        if (data.payload.scope === "document") {
          cache = ctx.store.cache.document;
        } else if (data.payload.scope === "script") {
          cache = ctx.store.cache.script;
        } else if (data.payload.scope === "user") {
          cache = ctx.store.cache.user;
        }

        if (cache) {
          delete cache[data.payload.key];
        }
        Atomics.store(sharedArray, 0, 0);
        Atomics.notify(sharedArray, 0);
      } else if (data.message === "vegas:Cache#removeAll") {
        let cache = null;
        if (data.payload.scope === "document") {
          cache = ctx.store.cache.document;
        } else if (data.payload.scope === "script") {
          cache = ctx.store.cache.script;
        } else if (data.payload.scope === "user") {
          cache = ctx.store.cache.user;
        }

        if (cache) {
          (data.payload.keys as string[]).forEach((key) => {
            delete cache[key];
          });
        }
        Atomics.store(sharedArray, 0, 0);
        Atomics.notify(sharedArray, 0);
      } else if (data.message === "vegas:resolve") {
        resolve(data.payload);
      }
    });
  });
}
