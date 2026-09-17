import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createLockService,
  Lock,
  LockService,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type LockHostCall,
} from "./index";

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #acquireResult: boolean;
  readonly #documentAvailable: boolean;
  readonly #hasResult: boolean;

  constructor(documentAvailable = true, acquireResult = true, hasResult = true) {
    this.#documentAvailable = documentAvailable;
    this.#acquireResult = acquireResult;
    this.#hasResult = hasResult;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "lock") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    switch (call.operation) {
      case "isAvailable": {
        return (call.namespace !== "document" ||
          this.#documentAvailable) as unknown as HostCallResult<C>;
      }
      case "acquire": {
        return this.#acquireResult as unknown as HostCallResult<C>;
      }
      case "has": {
        return this.#hasResult as unknown as HostCallResult<C>;
      }
      case "release": {
        return undefined as unknown as HostCallResult<C>;
      }
    }
  }
}

describe("Lock Runtime objects", () => {
  test("map Lock host calls to operation-specific result types", () => {
    const acquireCall = {
      service: "lock",
      operation: "acquire",
      namespace: "script",
      timeoutInMillis: 1_000,
    } satisfies LockHostCall;
    const hasCall = {
      service: "lock",
      operation: "has",
      namespace: "user",
    } satisfies LockHostCall;
    const releaseCall = {
      service: "lock",
      operation: "release",
      namespace: "script",
    } satisfies LockHostCall;

    expectTypeOf<HostCallResult<typeof acquireCall>>().toEqualTypeOf<boolean>();
    expectTypeOf<HostCallResult<typeof hasCall>>().toEqualTypeOf<boolean>();
    expectTypeOf<HostCallResult<typeof releaseCall>>().toEqualTypeOf<void>();
  });

  test("expose script and user Locks and return null when document Lock is unavailable", () => {
    const availableBridge = new RecordingHostBridge();
    const available = createLockService(availableBridge);

    expect(available).toBeInstanceOf(LockService);
    expect(available.getScriptLock()).toBeInstanceOf(Lock);
    expect(available.getUserLock()).toBeInstanceOf(Lock);
    expect(available.getDocumentLock()).toBeInstanceOf(Lock);

    const unavailableBridge = new RecordingHostBridge(false);
    const unavailable = createLockService(unavailableBridge);

    expect(unavailable.getDocumentLock()).toBeNull();
    expect(unavailableBridge.calls).toStrictEqual([
      {
        service: "lock",
        operation: "isAvailable",
        namespace: "document",
      },
    ]);
  });

  test("map Lock methods to semantic host calls", () => {
    const bridge = new RecordingHostBridge();
    const lock = createLockService(bridge).getScriptLock();

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
    const bridge = new RecordingHostBridge(true, false);
    const lock = createLockService(bridge).getScriptLock();

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
