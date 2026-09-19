import { describe, expect, test } from "vitest";

import { Lock, type HostBridge, type HostCall, type HostCallResult } from "./index";

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #acquireResult: boolean;
  readonly #hasResult: boolean;

  constructor(acquireResult = true, hasResult = true) {
    this.#acquireResult = acquireResult;
    this.#hasResult = hasResult;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "lock") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    switch (call.operation) {
      case "acquire": {
        return this.#acquireResult as unknown as HostCallResult<C>;
      }
      case "has": {
        return this.#hasResult as unknown as HostCallResult<C>;
      }
      case "release": {
        return undefined as unknown as HostCallResult<C>;
      }
      default:
        throw new Error(`unexpected Lock operation: ${call.operation}`);
    }
  }
}

describe("Lock Runtime object", () => {
  test("map methods to semantic host calls", () => {
    const bridge = new RecordingHostBridge();
    const lock = new Lock(bridge, "script");

    expect(lock.hasLock()).toBe(true);
    expect(lock.tryLock(250)).toBe(true);
    expect(() => lock.waitLock(500)).not.toThrow();
    lock.releaseLock();

    expect(bridge.calls).toStrictEqual([
      {
        service: "lock",
        operation: "has",
        namespace: "script",
      },
      {
        service: "lock",
        operation: "acquire",
        namespace: "script",
        timeoutInMillis: 250,
      },
      {
        service: "lock",
        operation: "acquire",
        namespace: "script",
        timeoutInMillis: 500,
      },
      {
        service: "lock",
        operation: "release",
        namespace: "script",
      },
    ]);
  });

  test("throw a local Error when waitLock cannot acquire before the timeout", () => {
    const bridge = new RecordingHostBridge(false);
    const lock = new Lock(bridge, "script");

    expect(() => lock.waitLock(100)).toThrow("Local Lock wait timed out after 100 milliseconds.");
    expect(bridge.calls).toStrictEqual([
      {
        service: "lock",
        operation: "acquire",
        namespace: "script",
        timeoutInMillis: 100,
      },
    ]);
  });
});
