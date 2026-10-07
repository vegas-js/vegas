import { EventEmitter } from "node:events";

import { describe, expect, test } from "vitest";

import {
  HostDispatcher,
  InMemoryPropertiesStore,
  PropertiesHostHandler,
  RuntimeInfrastructureError,
} from "../index";
import { runAppsScriptWorkerSession } from "./apps-script-executor";
import type { AppsScriptWorkerRequest } from "./apps-script-worker-protocol";

class TestWorker extends EventEmitter {
  terminateCount = 0;

  async terminate(): Promise<number> {
    this.terminateCount += 1;
    return 1;
  }
}

class FailingPort extends EventEmitter {
  closeCount = 0;
  readonly cause = new DOMException("could not clone", "DataCloneError");

  postMessage(): void {
    throw this.cause;
  }

  close(): void {
    this.closeCount += 1;
  }
}

function createDispatcher(): HostDispatcher {
  return new HostDispatcher({
    properties: new PropertiesHostHandler(new InMemoryPropertiesStore(), {
      scriptKey: "script",
      userKey: "user",
    }),
  });
}

const invocation = {
  type: "invoke",
  functionName: "main",
  args: [() => "not cloneable"],
} satisfies AppsScriptWorkerRequest;

describe("Apps Script worker invocation transport", () => {
  test("terminate the worker when the invocation cannot be serialized", async () => {
    const gasWorker = new TestWorker();
    const port = new FailingPort();
    const result = runAppsScriptWorkerSession(
      gasWorker,
      port,
      new Int32Array(new SharedArrayBuffer(4)),
      createDispatcher(),
      invocation,
    );

    await expect(result).rejects.toBeInstanceOf(RuntimeInfrastructureError);
    await expect(result).rejects.toMatchObject({
      kind: "serialization",
      message: "Apps Script invocation could not be serialized.",
      cause: port.cause,
    });
    expect(gasWorker.terminateCount).toBe(1);
    expect(port.closeCount).toBe(1);
  });
});
