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
import { RuntimeInfrastructureError } from "../runtime-infrastructure-error";
import type { SpreadsheetStore } from "../spreadsheet-store";
import type { SpreadsheetUrlCapability } from "../spreadsheet-url-capability";
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
  on(event: "close", listener: () => void): unknown;
  postMessage(value: unknown): void;
  close(): void;
}

interface AppsScriptWorkerSessionOptions {
  readonly executionTimeoutMs?: number;
  readonly signal?: AbortSignal;
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
  options: AppsScriptWorkerSessionOptions = {},
): Promise<unknown> {
  const timeoutMs = requireExecutionTimeout(
    options.executionTimeoutMs ?? DEFAULT_APPS_SCRIPT_EXECUTION_TIMEOUT_MS,
  );

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;
    let workerExitCode: number | undefined;
    let workerPortClosed = false;
    let pendingMessageCount = 0;

    const clearExecutionLifecycle = (): void => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      if (abortListener !== undefined && options.signal !== undefined) {
        options.signal.removeEventListener("abort", abortListener);
        abortListener = undefined;
      }
    };

    const settle = (complete: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearExecutionLifecycle();
      port.close();
      complete();
    };

    const terminate = (error: unknown): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearExecutionLifecycle();
      port.close();

      void gasWorker.terminate().then(
        () => {
          reject(error);
        },
        () => {
          reject(error);
        },
      );
    };

    const fail = (error: unknown): void => {
      settle(() => {
        reject(error);
      });
    };

    const failExitedWorker = (): void => {
      if (settled || workerExitCode === undefined || !workerPortClosed || pendingMessageCount > 0) {
        return;
      }

      fail(
        new RuntimeInfrastructureError(
          "backend",
          `Apps Script worker exited before returning a result (code ${workerExitCode}).`,
        ),
      );
    };

    const handleMessage = async (data: unknown): Promise<void> => {
      if (await handleHostRequestMessage(port, sharedArray, dispatcher, data)) {
        return;
      }

      if (!isAppsScriptWorkerResponse(data)) {
        fail(new RuntimeInfrastructureError("protocol", "Unexpected Apps Script worker message."));
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
      workerExitCode = exitCode;
      failExitedWorker();
    });

    port.on("close", () => {
      workerPortClosed = true;
      failExitedWorker();
    });

    port.on("message", (data) => {
      if (settled) {
        return;
      }

      pendingMessageCount += 1;

      void handleMessage(data)
        .catch(fail)
        .finally(() => {
          pendingMessageCount -= 1;
          failExitedWorker();
        });
    });

    if (options.signal !== undefined) {
      abortListener = () => {
        terminate(options.signal?.reason ?? new Error("Apps Script execution aborted."));
      };

      options.signal.addEventListener("abort", abortListener, { once: true });

      if (options.signal.aborted) {
        abortListener();
        return;
      }
    }

    timeoutId = setTimeout(() => {
      terminate(
        new RuntimeInfrastructureError(
          "timeout",
          `Apps Script execution timed out after ${timeoutMs} ms.`,
        ),
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

  return runAppsScriptWorkerSession(gasWorker, port1, sharedArray, dispatcher, invocation, {
    executionTimeoutMs,
    signal: request.signal,
  });
}

export interface NodeAppsScriptExecutorOptions {
  readonly cacheStore: CacheStore;
  readonly driveIteratorStore: DriveIteratorStore;
  readonly driveStore: DriveStore;
  readonly lockStore: LockStore;
  readonly propertiesStore: PropertiesStore;
  readonly spreadsheetStore: SpreadsheetStore;
  readonly spreadsheetUrlCapability?: SpreadsheetUrlCapability;
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
    spreadsheetUrlCapability: options.spreadsheetUrlCapability,
    urlFetchCapability: new NodeUrlFetchCapability(),
    runWorker: (dispatcher, request) =>
      runAppsScriptWorker(dispatcher, request, executionTimeoutMs),
  });
}
