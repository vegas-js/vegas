import path from "node:path";
import worker from "node:worker_threads";

import {
  createHostResponse,
  HostDispatcher,
  PropertiesHostHandler,
  type Executor,
  type HostRequestMessage,
  type InvocationScope,
  type PropertiesStore,
} from "../../runtime";
import type { ServeContext } from "./context";
import {
  HtmlServiceHandler,
  SessionHandler,
  CacheHandler,
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

function isHostRequestMessage(value: unknown): value is HostRequestMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const request = value as {
    id?: unknown;
    call?: unknown;
  };

  if (typeof request.id !== "number" || typeof request.call !== "object" || request.call === null) {
    return false;
  }

  const call = request.call as {
    service?: unknown;
    operation?: unknown;
  };

  return (
    (call.service === "drive" || call.service === "properties") &&
    typeof call.operation === "string"
  );
}

function launchGAS(
  ctx: ServeContext,
  handler: GASHandler,
  dispatcher: HostDispatcher,
  invocationScope: InvocationScope,
  source: string,
  fn: string,
  ...args: any[]
): Promise<any> {
  return new Promise((resolve, reject) => {
    const sharedBuffer = new SharedArrayBuffer(4);
    const sharedArray = new Int32Array(sharedBuffer);
    const { port1, port2 } = new worker.MessageChannel();
    const gasWorker = new worker.Worker(path.join(import.meta.dirname, "worker.js"), {
      env: { ...process.env, FORCE_COLOR: "1" },
      transferList: [port2],
      workerData: {
        code: source,
        sharedArray,
        port: port2,
      },
    });

    gasWorker.on("error", (err: any) => {
      console.error(err);
      reject(err);
    });

    port1.on("message", async (data) => {
      if (isHostRequestMessage(data)) {
        try {
          port1.postMessage(await createHostResponse(dispatcher, data));
        } finally {
          Atomics.store(sharedArray, 0, 0);
          Atomics.notify(sharedArray, 0);
        }
        return;
      }

      if (data.message === "resolve") {
        port1.close();
        resolve(data.payload);
      } else {
        try {
          await (handler as any)[data.message](
            port1,
            sharedArray,
            ctx,
            data.payload,
            invocationScope,
          );
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

export function createLegacyAppsScriptExecutor(
  ctx: ServeContext,
  propertiesStore: PropertiesStore,
): Executor {
  const handler = new GASHandler();

  return {
    execute(request) {
      const dispatcher = new HostDispatcher({
        properties: new PropertiesHostHandler(propertiesStore, request.scope),
      });

      return launchGAS(
        ctx,
        handler,
        dispatcher,
        request.scope,
        request.program.source,
        request.functionName,
        ...request.args,
      );
    },
  };
}
