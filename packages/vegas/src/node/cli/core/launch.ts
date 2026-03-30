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
  constructor() {
    const proxyHandler: ProxyHandler<any> = {
      get(target, property, receiver) {
        const thisFn = Reflect.get(target, property, receiver);
        if (thisFn) {
          return thisFn;
        }
        return async (port: worker.MessagePort, sharedArray: Int32Array, ...args: any[]) => {
          const [clazz, method] = property.toString().split("#");
          try {
            const result = await target[clazz][method](...args);
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
handler.addHandler(RangeHandler);
handler.addHandler(UrlFetchAppHandler);

export function launchGAS(ctx: ServeContext, fn: string, ...args: any[]): Promise<any> {
  return new Promise((resolve) => {
    const sharedBuffer = new SharedArrayBuffer(4);
    const sharedArray = new Int32Array(sharedBuffer);
    const { port1, port2 } = new worker.MessageChannel();
    new worker.Worker(path.join(import.meta.dirname, "worker.js"), {
      env: { ...process.env, FORCE_COLOR: "1" },
      transferList: [port2],
      workerData: { code: ctx.code.server, sharedArray, port: port2 },
    });

    port1.postMessage({ fn, args });
    port1.on("message", async (data) => {
      if (data.message === "resolve") {
        port1.close();
        resolve(data.payload);
      } else {
        await (handler as any)[data.message](port1, sharedArray, ctx, data.payload);
      }
    });
  });
}
