import path from "node:path";
import worker from "node:worker_threads";

import { createAppsScriptExecutor, type AppsScriptWorkerRunner } from "../apps-script-executor";
import type { CacheStore } from "../cache-store";
import type { DriveIteratorStore } from "../drive-iterator-store";
import type { DriveStore } from "../drive-store";
import type { Executor } from "../executor";
import type { HostCallDispatcher } from "../host-dispatcher";
import type { LockStore } from "../lock-store";
import type { PropertiesStore } from "../properties-store";
import type { SpreadsheetStore } from "../spreadsheet-store";
import {
  isAppsScriptWorkerResponse,
  restoreAppsScriptWorkerError,
  type AppsScriptWorkerRequest,
} from "./apps-script-worker-protocol";
import { NodeBlobConversionCapability } from "./blob-conversion-capability";
import { handleHostRequestMessage } from "./host-request-handler";
import { NodeUrlFetchCapability } from "./url-fetch-capability";

export const DEFAULT_APPS_SCRIPT_EXECUTION_TIMEOUT_MS = 6 * 60 * 1_000;

interface AppsScriptWorkerProcess {
  on(event: "error", listener: (error: Error) => void): unknown;
  on(event: "exit", listener: (exitCode: number) => void): unknown;
  terminate(): Promise<number>;
}

interface AppsScriptWorkerPort {
  on(event: "message", listener: (data: unknown) => void): unknown;
  postMessage(value: unknown): void;
  close(): void;
}

function requireExecutionTimeout(timeoutMs: number): number {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError("Apps Script execution timeout must be a positive integer.");
  }

  return timeoutMs;
}

export function runAppsScriptWorkerSession(
  gasWorker: AppsScriptWorkerProcess,
  port: AppsScriptWorkerPort,
  sharedArray: Int32Array,
  dispatcher: HostCallDispatcher,
  invocation: AppsScriptWorkerRequest,
  executionTimeoutMs = DEFAULT_APPS_SCRIPT_EXECUTION_TIMEOUT_MS,
): Promise<unknown> {
  const timeoutMs = requireExecutionTimeout(executionTimeoutMs);

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const clearExecutionTimeout = (): void => {
      if (timeoutId === undefined) {
        return;
      }

      clearTimeout(timeoutId);
      timeoutId = undefined;
    };

    const settle = (complete: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearExecutionTimeout();
      port.close();
      complete();
    };

    const fail = (error: unknown): void => {
      settle(() => {
        reject(error);
      });
    };

    const handleMessage = async (data: unknown): Promise<void> => {
      if (await handleHostRequestMessage(port, sharedArray, dispatcher, data)) {
        return;
      }

      if (!isAppsScriptWorkerResponse(data)) {
        fail(new Error("Unexpected Apps Script worker message."));
        return;
      }

      if (data.ok) {
        settle(() => {
          resolve(data.value);
        });
        return;
      }

      fail(restoreAppsScriptWorkerError(data.error));
    };

    gasWorker.on("error", (error) => {
      if (settled) {
        return;
      }

      console.error(error);
      fail(error);
    });

    gasWorker.on("exit", (exitCode) => {
      fail(new Error(`Apps Script worker exited before returning a result (code ${exitCode}).`));
    });

    port.on("message", (data) => {
      if (settled) {
        return;
      }

      void handleMessage(data).catch(fail);
    });

    timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      timeoutId = undefined;
      port.close();

      const timeoutError = new Error(`Apps Script execution timed out after ${timeoutMs} ms.`);

      void gasWorker.terminate().then(
        () => {
          reject(timeoutError);
        },
        () => {
          reject(timeoutError);
        },
      );
    }, timeoutMs);

    try {
      port.postMessage(invocation);
    } catch (error) {
      fail(error);
    }
  });
}

function runAppsScriptWorker(
  dispatcher: HostCallDispatcher,
  request: Parameters<AppsScriptWorkerRunner>[1],
  executionTimeoutMs: number,
): Promise<unknown> {
  const sharedBuffer = new SharedArrayBuffer(4);
  const sharedArray = new Int32Array(sharedBuffer);
  const { port1, port2 } = new worker.MessageChannel();
  const gasWorker = new worker.Worker(path.join(import.meta.dirname, "worker.js"), {
    env: { ...process.env, FORCE_COLOR: "1" },
    transferList: [port2],
    workerData: {
      program: request.program,
      environment: request.environment,
      context: request.context,
      sharedArray,
      port: port2,
    },
  });
  const invocation: AppsScriptWorkerRequest = {
    type: "invoke",
    functionName: request.functionName,
    args: request.args,
  };

  return runAppsScriptWorkerSession(
    gasWorker,
    port1,
    sharedArray,
    dispatcher,
    invocation,
    executionTimeoutMs,
  );
}

export interface NodeAppsScriptExecutorOptions {
  readonly cacheStore: CacheStore;
  readonly driveIteratorStore: DriveIteratorStore;
  readonly driveStore: DriveStore;
  readonly lockStore: LockStore;
  readonly propertiesStore: PropertiesStore;
  readonly spreadsheetStore: SpreadsheetStore;
  readonly executionTimeoutMs?: number;
}

export function createNodeAppsScriptExecutor(options: NodeAppsScriptExecutorOptions): Executor {
  const executionTimeoutMs = requireExecutionTimeout(
    options.executionTimeoutMs ?? DEFAULT_APPS_SCRIPT_EXECUTION_TIMEOUT_MS,
  );

  return createAppsScriptExecutor({
    blobConversionCapability: new NodeBlobConversionCapability(),
    cacheStore: options.cacheStore,
    driveIteratorStore: options.driveIteratorStore,
    driveStore: options.driveStore,
    lockStore: options.lockStore,
    propertiesStore: options.propertiesStore,
    spreadsheetStore: options.spreadsheetStore,
    urlFetchCapability: new NodeUrlFetchCapability(),
    runWorker: (dispatcher, request) =>
      runAppsScriptWorker(dispatcher, request, executionTimeoutMs),
  });
}
