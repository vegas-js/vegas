import path from "node:path";
import worker from "node:worker_threads";

import { dispatchRuntimeRequest } from "../../runtime/dispatcher";
import type { RuntimeGlobalEnvironment } from "../../runtime/environment";
import { serializeRuntimeError } from "../../runtime/errorCodec";
import { createRuntimeServiceRegistry } from "../../runtime/host/registry";
import type { Clock, Fetcher, HtmlResourceResolver } from "../../runtime/host/services";
import type { RuntimeRequest, RuntimeServiceRegistry } from "../../runtime/protocol";
import { ServeContext } from "./context";
import { SheetHandler } from "./handlers";

class GASHandler {
  #handlers: Record<string, Record<string, any>>;

  constructor() {
    this.#handlers = {
      Sheet: new SheetHandler(),
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

const fetcher: Fetcher = {
  async fetch(request) {
    const { url, body, ...init } = request;
    const response = await fetch(url, {
      ...init,
      body: body as BodyInit,
    });
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      headers,
      content: Array.from(await response.bytes()),
      responseCode: response.status,
    };
  },
};

interface LaunchGASOptions {
  resultProjection?: "legacy-web-app";
}

export function launchGAS(
  context: ServeContext,
  fn: string,
  args: readonly unknown[],
  options: LaunchGASOptions = {},
): Promise<any> {
  const sourcePath = path.join(context.config.output.dir, "Code.js");
  const code = context.vfs.readFileSync(sourcePath, "utf8");
  const htmlResourceResolver: HtmlResourceResolver = {
    resolve(filename) {
      const filePath = `${path.join(context.config.output.dir, path.parse(filename).name)}.html`;

      return context.vfs.readFileSync(filePath, "utf8");
    },
  };
  const systemClock: Clock = {
    now: () => Date.now(),
  };
  const runtimeServices = createRuntimeServiceRegistry({
    spreadsheetStore: context.store.spreadsheet,
    fetcher,
    htmlResourceResolver,
    cacheStore: context.store.cache,
    propertiesStore: context.store.properties,
    sessionEnvironment: {
      executeAs: context.config.gas.webapp!.executeAs!,
      timeZone: context.config.gas.timeZone,
      activeUserEmail: context.mock["Session"]?.activeUserEmail,
      effectiveUserEmail: context.mock["Session"]?.effectiveUserEmail,
      activeUserLocale: context.mock["Session"]?.activeUserLocale,
      temporaryActiveUserKey: context.mock["Session"]?.temporaryActiveUserKey,
    },
    clock: systemClock,
  });
  const runtimeEnvironment: RuntimeGlobalEnvironment = {
    properties: {
      documentProperties: "available",
    },
  };

  return new Promise((resolve, reject) => {
    const sharedBuffer = new SharedArrayBuffer(4);
    const sharedArray = new Int32Array(sharedBuffer);
    const { port1, port2 } = new worker.MessageChannel();
    const gasWorker = new worker.Worker(path.join(import.meta.dirname, "worker.js"), {
      env: { ...process.env, FORCE_COLOR: "1" },
      transferList: [port2],
      workerData: { code, sharedArray, port: port2, environment: runtimeEnvironment },
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
    port1.postMessage({
      fn,
      args,
      resultProjection: options.resultProjection,
    });
  });
}
