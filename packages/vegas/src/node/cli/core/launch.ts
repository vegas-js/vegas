import path from "node:path";
import worker from "node:worker_threads";

import type { RuntimeRequest } from "../../runtime/protocol";
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
      Cache: new CacheHandler(),
      Properties: new PropertiesHandler(),
      SpreadsheetApp: new SpreadsheetAppHandler(),
      Sheet: new SheetHandler(),
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

async function dispatchRuntimeRequest(context: ServeContext, request: RuntimeRequest) {
  const rangeHandler = new RangeHandler(context);
  const sessionHandler = new SessionHandler(context);

  switch (request.service) {
    case "Range": {
      switch (request.method) {
        case "getValue": {
          return rangeHandler.getValue(...request.args);
        }
        case "getValues": {
          return rangeHandler.getValues(...request.args);
        }
        case "setValue": {
          return rangeHandler.setValue(...request.args);
        }
        case "setValues": {
          return rangeHandler.setValues(...request.args);
        }
      }
    }
    case "Session": {
      switch (request.method) {
        case "getActiveUser": {
          return sessionHandler.getActiveUser(...request.args);
        }
        case "getActiveUserLocale": {
          return sessionHandler.getActiveUserLocale(...request.args);
        }
        case "getEffectiveUser": {
          return sessionHandler.getEffectiveUser(...request.args);
        }
        case "getScriptTimeZone": {
          return sessionHandler.getScriptTimeZone(...request.args);
        }
        case "getTemporaryActiveUserKey": {
          return sessionHandler.getTemporaryActiveUserKey(...request.args);
        }
      }
    }
  }
}

async function handleRuntimeRequest(
  port: worker.MessagePort,
  sharedArray: Int32Array,
  context: ServeContext,
  request: RuntimeRequest,
) {
  try {
    const result = await dispatchRuntimeRequest(context, request);

    if (result !== undefined) {
      port.postMessage(result);
    }
  } finally {
    Atomics.store(sharedArray, 0, 0);
    Atomics.notify(sharedArray, 0);
  }
}

export function launchGAS(context: ServeContext, fn: string, ...args: any[]): Promise<any> {
  const sourcePath = path.join(context.config.output.dir, "Code.js");
  const code = context.vfs.readFileSync(sourcePath, "utf8");
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
        return;
      }

      try {
        if (data.type === "service-call") {
          await handleRuntimeRequest(port1, sharedArray, context, data);
        } else {
          await (handler as any)[data.message](port1, sharedArray, context, data.payload);
        }
      } catch (err: any) {
        port1.close();
        console.error(err);
        reject(err);
      }
    });
    port1.postMessage({ fn, args });
  });
}
