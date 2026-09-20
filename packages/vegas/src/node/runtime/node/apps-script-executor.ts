import path from "node:path";
import worker from "node:worker_threads";

import { createAppsScriptExecutor, type AppsScriptWorkerRunner } from "../apps-script-executor";
import type { CacheStore } from "../cache-store";
import type { DriveIteratorStore } from "../drive-iterator-store";
import type { DriveStore } from "../drive-store";
import type { Executor } from "../executor";
import type { LockStore } from "../lock-store";
import type { PropertiesStore } from "../properties-store";
import type { SpreadsheetStore } from "../spreadsheet-store";
import {
  isAppsScriptWorkerResponse,
  restoreAppsScriptWorkerError,
  type AppsScriptWorkerRequest,
} from "./apps-script-worker-protocol";
import { handleHostRequestMessage } from "./host-request-handler";
import { NodeUrlFetchCapability } from "./url-fetch-capability";

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

    gasWorker.on("error", (error) => {
      console.error(error);
      reject(error);
    });

    port1.on("message", async (data) => {
      if (await handleHostRequestMessage(port1, sharedArray, dispatcher, data)) {
        return;
      }

      port1.close();

      if (!isAppsScriptWorkerResponse(data)) {
        reject(new Error("Unexpected Apps Script worker message."));
        return;
      }

      if (data.ok) {
        resolve(data.value);
        return;
      }

      reject(restoreAppsScriptWorkerError(data.error));
    });

    const invocation: AppsScriptWorkerRequest = {
      type: "invoke",
      functionName: request.functionName,
      args: request.args,
    };
    port1.postMessage(invocation);
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
