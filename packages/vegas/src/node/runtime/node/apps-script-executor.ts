import path from "node:path";
import worker from "node:worker_threads";

import { createAppsScriptExecutor, type AppsScriptWorkerRunner } from "../apps-script-executor";
import type { CacheStore } from "../cache/store";
import type { DriveIteratorStore } from "../drive/iterator-store";
import type { DriveStore } from "../drive/store";
import type { Executor } from "../executor";
import type { HostCallDispatcher } from "../host-dispatcher";
import type { LockStore } from "../lock/store";
import type { PropertiesStore } from "../properties/store";
import { RuntimeInfrastructureError } from "../runtime-infrastructure-error";
import type { SpreadsheetStore } from "../spreadsheet/store";
import type { SpreadsheetUrlCapability } from "../spreadsheet/url-capability";
import {
  parseAppsScriptWorkerResponse,
  restoreAppsScriptWorkerError,
  type AppsScriptWorkerRequest,
} from "./apps-script-worker-protocol";
import { NodeBlobConversionCapability } from "./blob-conversion-capability";
import { handleHostRequestMessage } from "./host-request-handler";
import { NodeUrlFetchCapability } from "./url-fetch-capability";

export const DEFAULT_APPS_SCRIPT_EXECUTION_TIMEOUT_MS = 6 * 60 * 1_000;
// Node.js timers clamp longer delays to 1 ms. Validate before scheduling.
const MAX_NODE_TIMER_DELAY_MS = 2_147_483_647;

interface AppsScriptWorkerProcess {
  on(event: "error", listener: (error: Error) => void): unknown;
  on(event: "exit", listener: (exitCode: number) => void): unknown;
  terminate(): Promise<number>;
}

interface AppsScriptWorkerPort {
  on(event: "message", listener: (data: unknown) => void): unknown;
  on(event: "close", listener: () => void): unknown;
  on(event: "messageerror", listener: (error: Error) => void): unknown;
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
  if (timeoutMs > MAX_NODE_TIMER_DELAY_MS) {
    throw new RangeError(
      `Apps Script execution timeout must not exceed ${MAX_NODE_TIMER_DELAY_MS} ms.`,
    );
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

      // Report a timeout or cancellation without waiting for worker shutdown.
      // Keep the original failure even if termination itself rejects.
      void gasWorker.terminate().catch(() => undefined);
      reject(error);
    };

    const fail = (error: unknown): void => {
      settle(() => {
        reject(error);
      });
    };

    const failWithoutResult = (): void => {
      if (settled || !workerPortClosed || pendingMessageCount > 0) {
        return;
      }

      // The response channel may close while the worker is still running.
      // Stop it immediately rather than waiting for an exit event or timeout.
      if (workerExitCode === undefined) {
        terminate(
          new RuntimeInfrastructureError(
            "backend",
            "Apps Script worker channel closed before returning a result.",
          ),
        );
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

      const response = parseAppsScriptWorkerResponse(data);
      if (response === undefined) {
        // A fatal protocol violation leaves the worker without a usable channel.
        terminate(
          new RuntimeInfrastructureError("protocol", "Unexpected Apps Script worker message."),
        );
        return;
      }

      if (response.ok) {
        settle(() => {
          resolve(response.value);
        });
        return;
      }

      fail(restoreAppsScriptWorkerError(response.error));
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
      failWithoutResult();
    });

    port.on("close", () => {
      workerPortClosed = true;
      failWithoutResult();
    });

    // Deserialization failures do not produce a result message. Stop the worker
    // rather than letting the execution linger until its timeout.
    port.on("messageerror", (error) => {
      terminate(
        new RuntimeInfrastructureError(
          "serialization",
          "Apps Script worker message could not be deserialized.",
          { cause: error },
        ),
      );
    });

    port.on("message", (data) => {
      if (settled) {
        return;
      }

      pendingMessageCount += 1;

      // A failed host response can leave the worker blocked in Atomics.wait().
      void handleMessage(data)
        .catch(terminate)
        .finally(() => {
          pendingMessageCount -= 1;
          failWithoutResult();
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
      terminate(
        new RuntimeInfrastructureError(
          "serialization",
          "Apps Script invocation could not be serialized.",
          { cause: error },
        ),
      );
    }
  });
}

function runAppsScriptWorker(
  dispatcher: HostCallDispatcher,
  request: Parameters<AppsScriptWorkerRunner>[1],
  executionTimeoutMs: number,
): Promise<unknown> {
  // Avoid starting a worker or evaluating its program after cancellation.
  if (request.signal?.aborted) {
    return Promise.reject(request.signal.reason ?? new Error("Apps Script execution aborted."));
  }

  const sharedBuffer = new SharedArrayBuffer(4);
  const sharedArray = new Int32Array(sharedBuffer);
  const { port1, port2 } = new worker.MessageChannel();
  let gasWorker: worker.Worker;
  try {
    gasWorker = new worker.Worker(path.join(import.meta.dirname, "worker.js"), {
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
  } catch (error) {
    // The ports are ours until ownership of port2 is transferred to a worker.
    port1.close();
    port2.close();
    throw error;
  }
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
