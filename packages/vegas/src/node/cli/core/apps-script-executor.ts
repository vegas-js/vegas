import path from "node:path";
import worker from "node:worker_threads";

import {
  createAppsScriptExecutor,
  type AppsScriptWorkerRunner,
  type CacheStore,
  type DriveIteratorStore,
  type DriveStore,
  type Executor,
  type LockStore,
  type PropertiesStore,
  type SpreadsheetStore,
} from "../../runtime";
import { handleHostRequestMessage, NodeUrlFetchCapability } from "../../runtime/node";

const runAppsScriptWorker: AppsScriptWorkerRunner = (dispatcher, request) =>
  new Promise((resolve, reject) => {
    const sharedBuffer = new SharedArrayBuffer(4);
    const sharedArray = new Int32Array(sharedBuffer);
    const { port1, port2 } = new worker.MessageChannel();
    const gasWorker = new worker.Worker(path.join(import.meta.dirname, "worker.js"), {
      env: { ...process.env, FORCE_COLOR: "1" },
      transferList: [port2],
      workerData: {
        program: request.program,
        environment: request.environment,
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
    port1.postMessage({
      fn: request.functionName,
      args: request.args,
    });
  });

export interface NodeAppsScriptExecutorOptions {
  readonly cacheStore: CacheStore;
  readonly driveIteratorStore: DriveIteratorStore;
  readonly driveStore: DriveStore;
  readonly lockStore: LockStore;
  readonly propertiesStore: PropertiesStore;
  readonly spreadsheetStore: SpreadsheetStore;
}

export function createNodeAppsScriptExecutor(options: NodeAppsScriptExecutorOptions): Executor {
  return createAppsScriptExecutor({
    cacheStore: options.cacheStore,
    driveIteratorStore: options.driveIteratorStore,
    driveStore: options.driveStore,
    lockStore: options.lockStore,
    propertiesStore: options.propertiesStore,
    spreadsheetStore: options.spreadsheetStore,
    urlFetchCapability: new NodeUrlFetchCapability(),
    runWorker: runAppsScriptWorker,
  });
}
