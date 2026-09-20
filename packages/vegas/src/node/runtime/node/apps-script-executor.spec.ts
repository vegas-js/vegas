import { EventEmitter } from "node:events";

import { describe, expect, expectTypeOf, test, vi } from "vitest";

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
import { createNodeAppsScriptExecutor, runAppsScriptWorkerSession } from "./apps-script-executor";
import type { AppsScriptWorkerRequest } from "./apps-script-worker-protocol";

class TestWorker extends EventEmitter {
  exit(exitCode: number): void {
    this.emit("exit", exitCode);
  }

  fail(error: Error): void {
    this.emit("error", error);
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

describe("runAppsScriptWorkerSession", () => {
  test("resolve one result and close the port exactly once", async () => {
    const gasWorker = new TestWorker();
    const port = new TestPort();
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
    );

    expect(port.posted).toStrictEqual([invocation]);

    port.receive({
      type: "result",
      ok: true,
      value: "result",
    });

    await expect(result).resolves.toBe("result");
    expect(port.closeCount).toBe(1);

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

      gasWorker.exit(1);
      expect(port.closeCount).toBe(1);
    } finally {
      consoleError.mockRestore();
    }
  });

  test("reject an exit before the worker returns a result", async () => {
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

    await expect(result).rejects.toThrow(
      "Apps Script worker exited before returning a result (code 1).",
    );
    expect(port.closeCount).toBe(1);
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

    expectTypeOf(executor).toEqualTypeOf<Executor>();
    expect(executor.execute).toBeTypeOf("function");
  });
});
