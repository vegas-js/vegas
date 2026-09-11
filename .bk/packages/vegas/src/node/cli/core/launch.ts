import path from "node:path";
import worker from "node:worker_threads";

import { ServeContext } from "./context";
import {
  HtmlServiceHandler,
  SessionHandler,
  CacheHandler,
  PropertiesHandler,
  SpreadsheetAppHandler,
  SheetHandler,
  RangeHandler,
  UrlFetchAppHandler,
} from "./handlers";

class GASHandler {
  #handlers: Record<string, Record<string, any>>;

  constructor() {
    this.#handlers = {
      HtmlService: new HtmlServiceHandler(),
      Session: new SessionHandler(),
      Cache: new CacheHandler(),
      Properties: new PropertiesHandler(),
      SpreadsheetApp: new SpreadsheetAppHandler(),
      Sheet: new SheetHandler(),
      Range: new RangeHandler(),
      UrlFetchApp: new UrlFetchAppHandler(),
    };

    const proxyHandler: ProxyHandler<this> = {
      get(target, property) {
        return async (port: worker.MessagePort, sharedArray: Int32Array, ...args: any[]) => {
          const [clazz, method] = String(property).split("#");
          try {
            const result = await target.#handlers[clazz][method](...args);
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
}

const handler = new GASHandler();

export function launchGAS(ctx: ServeContext, fn: string, ...args: any[]): Promise<any> {
  const sourcePath = path.join(ctx.config.output.dir, "Code.js");
  const code = ctx.vfs.readFileSync(sourcePath, "utf8");
  return new Promise((resolve, reject) => {
    const sharedBuffer = new SharedArrayBuffer(4);
    const sharedArray = new Int32Array(sharedBuffer);
    const { port1, port2 } = new worker.MessageChannel();
    const gasWorker = new worker.Worker(path.join(import.meta.dirname, "worker.js"), {
      env: { ...process.env, FORCE_COLOR: "1" },
      transferList: [port2],
      workerData: { code, sharedArray, port: port2 },
    });

    gasWorker.on("error", (err: any) => {
      console.error(err);
      reject(err);
    });

    port1.on("message", async (data) => {
      if (data.message === "resolve") {
        port1.close();
        resolve(data.payload);
      } else {
        try {
          await (handler as any)[data.message](port1, sharedArray, ctx, data.payload);
        } catch (err: any) {
          port1.close();
          console.error(err);
          reject(err);
        }
      }
    });
    port1.postMessage({ fn, args });
  });
}
