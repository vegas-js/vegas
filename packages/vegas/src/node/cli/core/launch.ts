import path from "node:path";
import worker from "node:worker_threads";

import { dispatchRuntimeRequest } from "../../runtime/dispatcher";
import { serializeRuntimeError } from "../../runtime/errorCodec";
import type { Clock } from "../../runtime/host/services";
import { CacheHandler, PropertiesHandler, RangeHandler } from "../../runtime/host/services";
import type { RuntimeRequest, RuntimeServiceRegistry } from "../../runtime/protocol";
import { ServeContext } from "./context";
import {
  HtmlServiceHandler,
  SessionHandler,
  SpreadsheetAppHandler,
  SheetHandler,
  UrlFetchAppHandler,
} from "./handlers";

class GASHandler {
  #handlers: Record<string, Record<string, any>>;

  constructor() {
    this.#handlers = {
      HtmlService: new HtmlServiceHandler(),
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

async function handleRuntimeRequest(
  port: worker.MessagePort,
  sharedArray: Int32Array,
  services: RuntimeServiceRegistry,
  request: RuntimeRequest,
) {
  try {
    const result = await dispatchRuntimeRequest(services, request);

    port.postMessage({ type: "service-result", result });
  } catch (error) {
    port.postMessage({ type: "service-error", error: serializeRuntimeError(error) });
  } finally {
    Atomics.store(sharedArray, 0, 0);
    Atomics.notify(sharedArray, 0);
  }
}

function createRuntimeServiceRegistry(context: ServeContext): RuntimeServiceRegistry {
  const systemClock: Clock = {
    now: () => Date.now(),
  };
  return {
    Range: new RangeHandler(context.store.spreadsheet),
    Session: new SessionHandler({
      executeAs: context.config.gas.webapp!.executeAs!,
      timeZone: context.config.gas.timeZone,
      activeUserEmail: context.mock["Session"]?.activeUserEmail,
      effectiveUserEmail: context.mock["Session"]?.effectiveUserEmail,
      activeUserLocale: context.mock["Session"]?.activeUserLocale,
      temporaryActiveUserKey: context.mock["Session"]?.temporaryActiveUserKey,
    }),
    Cache: new CacheHandler(context.store.cache, systemClock),
    Properties: new PropertiesHandler(context.store.properties),
  };
}

export function launchGAS(context: ServeContext, fn: string, ...args: any[]): Promise<any> {
  const sourcePath = path.join(context.config.output.dir, "Code.js");
  const code = context.vfs.readFileSync(sourcePath, "utf8");
  const runtimeServices = createRuntimeServiceRegistry(context);
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
          await handleRuntimeRequest(port1, sharedArray, runtimeServices, data);
          return;
        }
        await (handler as any)[data.message](port1, sharedArray, context, data.payload);
      } catch (err: any) {
        port1.close();
        console.error(err);
        reject(err);
      }
    });
    port1.postMessage({ fn, args });
  });
}
