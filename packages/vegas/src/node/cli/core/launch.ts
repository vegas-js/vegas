import path from "node:path";
import worker from "node:worker_threads";

import {
  CacheHostHandler,
  handleHostRequestMessage,
  HostDispatcher,
  LocalDriveHostHandler,
  LockHostHandler,
  PropertiesHostHandler,
  resolveDriveNamespace,
  type CacheStore,
  type DriveIteratorStore,
  type DriveStore,
  type Executor,
  type InvocationEnvironment,
  type InvocationScope,
  type LockStore,
  type Program,
  type PropertiesStore,
} from "../../runtime";
import type { ServeContext } from "./context";
import {
  HtmlServiceHandler,
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

function launchGAS(
  ctx: ServeContext,
  handler: GASHandler,
  dispatcher: HostDispatcher,
  environment: InvocationEnvironment,
  invocationScope: InvocationScope,
  program: Program,
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
        program,
        environment,
        sharedArray,
        port: port2,
      },
    });

    gasWorker.on("error", (err: any) => {
      console.error(err);
      reject(err);
    });

    port1.on("message", async (data) => {
      if (await handleHostRequestMessage(port1, sharedArray, dispatcher, data)) {
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
  cacheStore: CacheStore,
  lockStore: LockStore,
  propertiesStore: PropertiesStore,
  driveStore: DriveStore,
  driveIteratorStore: DriveIteratorStore,
): Executor {
  const handler = new GASHandler();

  return {
    execute(request) {
      const driveNamespace = resolveDriveNamespace(request.scope);
      const lockSession = lockStore.createSession();
      const dispatcher = new HostDispatcher({
        cache: new CacheHostHandler(cacheStore, request.scope),
        drive: new LocalDriveHostHandler(
          driveStore,
          driveNamespace,
          driveIteratorStore.createSession(driveNamespace),
        ),
        lock: new LockHostHandler(lockSession, request.scope),
        properties: new PropertiesHostHandler(propertiesStore, request.scope),
      });

      return launchGAS(
        ctx,
        handler,
        dispatcher,
        request.environment,
        request.scope,
        request.program,
        request.functionName,
        ...request.args,
      ).finally(() => lockSession.releaseAll());
    },
  };
}
