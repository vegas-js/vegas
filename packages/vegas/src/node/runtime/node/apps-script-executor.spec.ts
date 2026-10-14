import { EventEmitter } from "node:events";
import worker from "node:worker_threads";

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
  RuntimeInfrastructureError,
  type ExecutionRequest,
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

  test("stop a worker when its response channel closes without a result", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
    );

    port.disconnect();

    await expect(result).rejects.toBeInstanceOf(RuntimeInfrastructureError);
    await expect(result).rejects.toMatchObject({
      kind: "backend",
      message: "Apps Script worker channel closed before returning a result.",
    });
    expect(gasWorker.terminateCount).toBe(1);
    expect(port.closeCount).toBe(1);
  });

  test("finish a queued worker result before handling channel closure", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
    );

    port.receive({ type: "result", ok: true, value: "done" });
    port.disconnect();

    await expect(result).resolves.toBe("done");
    expect(gasWorker.terminateCount).toBe(0);
    expect(port.closeCount).toBe(1);
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

    await expect(result).rejects.toBeInstanceOf(RuntimeInfrastructureError);
    await expect(result).rejects.toMatchObject({
      kind: "backend",
      message: "Apps Script worker exited before returning a result (code 1).",
    });
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

    await expect(result).rejects.toBeInstanceOf(RuntimeInfrastructureError);
    await expect(result).rejects.toMatchObject({
      kind: "protocol",
      message: "Unexpected Apps Script worker message.",
    });
    expect(port.closeCount).toBe(1);
    expect(gasWorker.terminateCount).toBe(1);
  });

  test("consume worker result descriptors without direct property reads", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
    );
    const getter = vi.fn(() => {
      throw new Error("unexpected worker response getter");
    });
    const response = new Proxy({ type: "result", ok: true, value: "safe" }, { get: getter });
    port.receive(response);

    await expect(result).resolves.toBe("safe");
    expect(getter).not.toHaveBeenCalled();
    expect(gasWorker.terminateCount).toBe(0);
    expect(port.closeCount).toBe(1);
  });

  test("terminate on a worker message deserialization failure", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
    );
    const cause = new Error("deserialization failed");

    port.emit("messageerror", cause);

    await expect(result).rejects.toMatchObject({
      kind: "serialization",
      message: "Apps Script worker message could not be deserialized.",
      cause,
    });
    expect(port.closeCount).toBe(1);
    expect(gasWorker.terminateCount).toBe(1);
  });

  test("ignore message deserialization failures after a completed result", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
    );

    port.receive({ type: "result", ok: true, value: "done" });
    await expect(result).resolves.toBe("done");
    port.emit("messageerror", new Error("late error"));

    expect(port.closeCount).toBe(1);
    expect(gasWorker.terminateCount).toBe(0);
  });

  test("terminate a worker when a host response cannot be delivered", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    vi.spyOn(port, "postMessage").mockImplementation((value) => {
      if (port.posted.length > 0) {
        throw new Error("host response channel failed");
      }
      port.posted.push(value);
    });

    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
    );

    port.receive({
      id: 1,
      call: {
        service: "properties",
        operation: "get",
        namespace: "script",
        key: "environment",
      },
    });

    await expect(result).rejects.toMatchObject({
      kind: "serialization",
      message: "Host response 1 could not be serialized.",
    });
    expect(port.closeCount).toBe(1);
    expect(gasWorker.terminateCount).toBe(1);
  });

  test("keep executed code errors outside the infrastructure error model", async () => {
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
      type: "result",
      ok: false,
      error: {
        name: "TypeError",
        message: "user failure",
      },
    });

    await expect(result).rejects.toBeInstanceOf(TypeError);
    await expect(result).rejects.not.toBeInstanceOf(RuntimeInfrastructureError);
  });

  test("preserve cancellation when worker termination throws synchronously", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const controller = new AbortController();
    const terminate = vi.spyOn(gasWorker, "terminate").mockImplementation(() => {
      throw new Error("termination threw");
    });
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
      { signal: controller.signal },
    );
    const reason = new Error("execution cancelled");

    controller.abort(reason);

    await expect(result).rejects.toBe(reason);
    expect(terminate).toHaveBeenCalledOnce();
    expect(port.closeCount).toBe(1);
  });

  test("reject cancellation even when worker termination never settles", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const controller = new AbortController();
    const terminate = vi
      .spyOn(gasWorker, "terminate")
      .mockImplementation(() => new Promise<number>(() => undefined));
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
      { signal: controller.signal },
    );
    const reason = new Error("execution cancelled");

    controller.abort(reason);

    await expect(result).rejects.toBe(reason);
    expect(terminate).toHaveBeenCalledOnce();
    expect(port.closeCount).toBe(1);
  });

  test("keep the timeout error when worker termination rejects", async () => {
    vi.useFakeTimers();

    const gasWorker = new TestWorker();
    const port = new TestPort();
    const terminate = vi
      .spyOn(gasWorker, "terminate")
      .mockRejectedValue(new Error("termination failed"));
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
      { executionTimeoutMs: 100 },
    );
    const rejection = expect(result).rejects.toMatchObject({
      kind: "timeout",
      message: "Apps Script execution timed out after 100 ms.",
    });

    await vi.advanceTimersByTimeAsync(100);
    await rejection;
    expect(terminate).toHaveBeenCalledOnce();
    expect(port.closeCount).toBe(1);
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

    const rejection = expect(result).rejects.toMatchObject({
      kind: "timeout",
      message: "Apps Script execution timed out after 1000 ms.",
    });

    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;
    await expect(result).rejects.toBeInstanceOf(RuntimeInfrastructureError);

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

  test("reject execution timeouts that overflow Node.js timers", () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();

    expect(() =>
      runAppsScriptWorkerSession(
        gasWorker,
        port,
        new Int32Array(new SharedArrayBuffer(4)),
        createDispatcher(),
        invocation,
        { executionTimeoutMs: 2_147_483_648 },
      ),
    ).toThrow("Apps Script execution timeout must not exceed 2147483647 ms.");

    expect(port.posted).toHaveLength(0);
    expect(gasWorker.terminateCount).toBe(0);
  });
});

describe("createNodeAppsScriptExecutor", () => {
  test("avoid starting a worker when the invocation is already aborted", async () => {
    const controller = new AbortController();
    const reason = new Error("already cancelled");
    controller.abort(reason);
    const close = vi.spyOn(worker.MessagePort.prototype, "close");

    try {
      const executor = createNodeAppsScriptExecutor({
        cacheStore: new InMemoryCacheStore(),
        driveIteratorStore: new InMemoryDriveIteratorStore(),
        driveStore: new InMemoryDriveStore(),
        lockStore: new InMemoryLockStore(),
        propertiesStore: new InMemoryPropertiesStore(),
        spreadsheetStore: new InMemorySpreadsheetStore(),
      });
      const request: ExecutionRequest = {
        program: {
          source: "function main() {}",
          // Construction would otherwise fail while cloning this entry.
          htmlFiles: { invalid: (() => undefined) as unknown as string },
        },
        environment: {
          activeUserEmail: "",
          activeUserLocale: "en",
          effectiveUserEmail: "",
          scriptTimeZone: "UTC",
          temporaryActiveUserKey: "",
        },
        scope: { scriptKey: "script", userKey: "user" },
        functionName: "main",
        args: [],
        signal: controller.signal,
      };

      await expect(executor.execute(request)).rejects.toBe(reason);
      expect(close).not.toHaveBeenCalled();
    } finally {
      close.mockRestore();
    }
  });

  test("close both message ports when worker construction fails", async () => {
    const close = vi.spyOn(worker.MessagePort.prototype, "close");
    try {
      const executor = createNodeAppsScriptExecutor({
        cacheStore: new InMemoryCacheStore(),
        driveIteratorStore: new InMemoryDriveIteratorStore(),
        driveStore: new InMemoryDriveStore(),
        lockStore: new InMemoryLockStore(),
        propertiesStore: new InMemoryPropertiesStore(),
        spreadsheetStore: new InMemorySpreadsheetStore(),
      });
      const request: ExecutionRequest = {
        program: {
          source: "function main() {}",
          // A non-cloneable HTML entry exercises synchronous Worker construction failure.
          htmlFiles: { invalid: (() => undefined) as unknown as string },
        },
        environment: {
          activeUserEmail: "",
          activeUserLocale: "en",
          effectiveUserEmail: "",
          scriptTimeZone: "UTC",
          temporaryActiveUserKey: "",
        },
        scope: { scriptKey: "script", userKey: "user" },
        functionName: "main",
        args: [],
      };

      await expect(executor.execute(request)).rejects.toMatchObject({ name: "DataCloneError" });
      expect(close).toHaveBeenCalledTimes(2);
    } finally {
      close.mockRestore();
    }
  });

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

  test("reject configured timeouts that exceed Node.js timer limits", () => {
    expect(() =>
      createNodeAppsScriptExecutor({
        cacheStore: new InMemoryCacheStore(),
        driveIteratorStore: new InMemoryDriveIteratorStore(),
        driveStore: new InMemoryDriveStore(),
        lockStore: new InMemoryLockStore(),
        propertiesStore: new InMemoryPropertiesStore(),
        spreadsheetStore: new InMemorySpreadsheetStore(),
        executionTimeoutMs: 2_147_483_648,
      }),
    ).toThrow("Apps Script execution timeout must not exceed 2147483647 ms.");
  });
});
