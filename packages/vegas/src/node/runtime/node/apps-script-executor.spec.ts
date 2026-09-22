import { EventEmitter } from "node:events";

import { afterEach, describe, expect, expectTypeOf, test, vi } from "vitest";

import {
  HostDispatcher,
  InMemoryCacheStore,
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  InMemoryLockStore,
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  PropertiesHostHandler,
  type Executor,
} from "../index";
import {
  createNodeAppsScriptExecutor,
  DEFAULT_APPS_SCRIPT_EXECUTION_TIMEOUT_MS,
  runAppsScriptWorkerSession,
} from "./apps-script-executor";
import type { AppsScriptWorkerRequest } from "./apps-script-worker-protocol";

class TestWorker extends EventEmitter {
  terminateCount = 0;

  exit(exitCode: number): void {
    this.emit("exit", exitCode);
  }

  fail(error: Error): void {
    this.emit("error", error);
  }

  async terminate(): Promise<number> {
    this.terminateCount += 1;
    this.exit(1);

    return 1;
  }
}

class TestPort extends EventEmitter {
  readonly posted: unknown[] = [];
  closeCount = 0;

  postMessage(value: unknown): void {
    this.posted.push(value);
  }

  close(): void {
    this.closeCount += 1;
  }

  disconnect(): void {
    this.emit("close");
  }

  receive(value: unknown): void {
    this.emit("message", value);
  }
}

const invocation: AppsScriptWorkerRequest = {
  type: "invoke",
  functionName: "main",
  args: ["value"],
};

function createDispatcher() {
  return new HostDispatcher({
    properties: new PropertiesHostHandler(new InMemoryPropertiesStore(), {
      scriptKey: "script",
      userKey: "user",
    }),
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("runAppsScriptWorkerSession", () => {
  test("resolve one result and close the port exactly once", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const controller = new AbortController();
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
      { signal: controller.signal },
    );

    expect(port.posted).toStrictEqual([invocation]);

    port.receive({
      type: "result",
      ok: true,
      value: "result",
    });

    await expect(result).resolves.toBe("result");
    expect(port.closeCount).toBe(1);
    expect(gasWorker.terminateCount).toBe(0);

    controller.abort(new Error("too late"));

    expect(gasWorker.terminateCount).toBe(0);

    gasWorker.exit(0);
    expect(port.closeCount).toBe(1);
  });

  test("reject worker errors and ignore the following exit", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const error = new Error("worker crashed");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const result = runAppsScriptWorkerSession(
        gasWorker,
        port,
        new Int32Array(new SharedArrayBuffer(4)),
        createDispatcher(),
        invocation,
      );

      gasWorker.fail(error);

      await expect(result).rejects.toBe(error);
      expect(port.closeCount).toBe(1);
      expect(gasWorker.terminateCount).toBe(0);

      gasWorker.exit(1);
      expect(port.closeCount).toBe(1);
    } finally {
      consoleError.mockRestore();
    }
  });

  test("allow a queued result to arrive after the worker exit event", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
    );

    gasWorker.exit(0);
    port.receive({
      type: "result",
      ok: true,
      value: "result",
    });
    port.disconnect();

    await expect(result).resolves.toBe("result");
    expect(port.closeCount).toBe(1);
    expect(gasWorker.terminateCount).toBe(0);
  });

  test("reject an exit when the worker channel closes without a result", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
    );

    gasWorker.exit(1);
    port.disconnect();

    await expect(result).rejects.toThrow(
      "Apps Script worker exited before returning a result (code 1).",
    );
    expect(port.closeCount).toBe(1);
    expect(gasWorker.terminateCount).toBe(0);
  });

  test("reject unexpected worker messages", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
    );

    port.receive({
      type: "unknown",
    });

    await expect(result).rejects.toThrow("Unexpected Apps Script worker message.");
    expect(port.closeCount).toBe(1);
    expect(gasWorker.terminateCount).toBe(0);
  });

  test("terminate an execution when its signal is aborted", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const controller = new AbortController();
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
      { signal: controller.signal },
    );
    const abortReason = new Error("execution cancelled");

    controller.abort(abortReason);

    await expect(result).rejects.toBe(abortReason);
    expect(gasWorker.terminateCount).toBe(1);
    expect(port.closeCount).toBe(1);
  });

  test("do not invoke an execution whose signal is already aborted", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const controller = new AbortController();
    const abortReason = new Error("already cancelled");

    controller.abort(abortReason);

    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
      { signal: controller.signal },
    );

    await expect(result).rejects.toBe(abortReason);
    expect(port.posted).toHaveLength(0);
    expect(gasWorker.terminateCount).toBe(1);
    expect(port.closeCount).toBe(1);
  });

  test("terminate a worker that exceeds the execution deadline", async () => {
    vi.useFakeTimers();

    const gasWorker = new TestWorker();
    const port = new TestPort();
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
      { executionTimeoutMs: 1_000 },
    );

    const rejection = expect(result).rejects.toThrow(
      "Apps Script execution timed out after 1000 ms.",
    );

    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;

    expect(gasWorker.terminateCount).toBe(1);
    expect(port.closeCount).toBe(1);
  });

  test("require a positive integer execution timeout", () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();

    expect(() =>
      runAppsScriptWorkerSession(
        gasWorker,
        port,
        new Int32Array(new SharedArrayBuffer(4)),
        createDispatcher(),
        invocation,
        { executionTimeoutMs: 0 },
      ),
    ).toThrow("Apps Script execution timeout must be a positive integer.");

    expect(port.posted).toHaveLength(0);
    expect(gasWorker.terminateCount).toBe(0);
  });
});

describe("createNodeAppsScriptExecutor", () => {
  test("compose an Executor from named store dependencies", () => {
    const executor = createNodeAppsScriptExecutor({
      cacheStore: new InMemoryCacheStore(),
      driveIteratorStore: new InMemoryDriveIteratorStore(),
      driveStore: new InMemoryDriveStore(),
      lockStore: new InMemoryLockStore(),
      propertiesStore: new InMemoryPropertiesStore(),
      spreadsheetStore: new InMemorySpreadsheetStore(),
    });

    expect(DEFAULT_APPS_SCRIPT_EXECUTION_TIMEOUT_MS).toBe(360_000);
    expectTypeOf(executor).toEqualTypeOf<Executor>();
    expect(executor).toHaveProperty("execute");
  });

  test("reject an invalid execution timeout", () => {
    expect(() =>
      createNodeAppsScriptExecutor({
        cacheStore: new InMemoryCacheStore(),
        driveIteratorStore: new InMemoryDriveIteratorStore(),
        driveStore: new InMemoryDriveStore(),
        lockStore: new InMemoryLockStore(),
        propertiesStore: new InMemoryPropertiesStore(),
        spreadsheetStore: new InMemorySpreadsheetStore(),
        executionTimeoutMs: 0,
      }),
    ).toThrow("Apps Script execution timeout must be a positive integer.");
  });
});
