import path from "node:path";
import worker from "node:worker_threads";

import {
  CacheHostHandler,
  handleHostRequestMessage,
  HostDispatcher,
  LocalDriveHostHandler,
  LockHostHandler,
  NodeUrlFetchCapability,
  PropertiesHostHandler,
  resolveDriveNamespace,
  SpreadsheetHostHandler,
  UrlFetchHostHandler,
  type CacheStore,
  type DriveIteratorStore,
  type DriveStore,
  type Executor,
  type InvocationEnvironment,
  type LockStore,
  type Program,
  type PropertiesStore,
  type SpreadsheetStore,
} from "../../runtime";

function runAppsScriptWorker(
  dispatcher: HostDispatcher,
  environment: InvocationEnvironment,
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
        return;
      }

      port1.close();
      reject(new Error(`Unexpected worker message: ${String(data.message)}`));
    });
    port1.postMessage({ fn, args });
  });
}

export function createAppsScriptExecutor(
  cacheStore: CacheStore,
  lockStore: LockStore,
  propertiesStore: PropertiesStore,
  driveStore: DriveStore,
  driveIteratorStore: DriveIteratorStore,
  spreadsheetStore: SpreadsheetStore,
): Executor {
  const urlFetch = new UrlFetchHostHandler(new NodeUrlFetchCapability());

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
        spreadsheet: new SpreadsheetHostHandler(spreadsheetStore),
        urlFetch,
      });

      return runAppsScriptWorker(
        dispatcher,
        request.environment,
        request.program,
        request.functionName,
        ...request.args,
      ).finally(() => lockSession.releaseAll());
    },
  };
}
