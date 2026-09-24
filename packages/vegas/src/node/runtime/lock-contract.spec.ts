import { describe, expect, test } from "vitest";

import {
  createLockService,
  Lock,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

type LockNamespace = "document" | "script" | "user";

// Public contracts:
// https://developers.google.com/apps-script/reference/lock/lock-service
// https://developers.google.com/apps-script/reference/lock/lock
class StatefulLockBridge implements HostBridge {
  readonly #documentAvailable: boolean;
  readonly #acquireAllowed: boolean;
  readonly #acquired = new Map<LockNamespace, boolean>([
    ["document", false],
    ["script", false],
    ["user", false],
  ]);

  constructor(documentAvailable = true, acquireAllowed = true) {
    this.#documentAvailable = documentAvailable;
    this.#acquireAllowed = acquireAllowed;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    if (call.service !== "lock") {
      throw new Error("unexpected host service");
    }

    switch (call.operation) {
      case "isAvailable":
        return (call.namespace !== "document" ||
          this.#documentAvailable) as unknown as HostCallResult<C>;
      case "acquire":
        if (this.#acquired.get(call.namespace) === true) {
          return true as unknown as HostCallResult<C>;
        }

        if (!this.#acquireAllowed) {
          return false as unknown as HostCallResult<C>;
        }

        this.#acquired.set(call.namespace, true);
        return true as unknown as HostCallResult<C>;
      case "has":
        return (this.#acquired.get(call.namespace) ?? false) as unknown as HostCallResult<C>;
      case "release":
        this.#acquired.set(call.namespace, false);
        return undefined as unknown as HostCallResult<C>;
    }
  }
}

describe("LockService public contract", () => {
  test("scope locks and return null without a containing document", () => {
    const service = createLockService(new StatefulLockBridge());
    const scriptLock = service.getScriptLock();
    const userLock = service.getUserLock();

    expect(scriptLock).toBeInstanceOf(Lock);
    expect(userLock).toBeInstanceOf(Lock);
    expect(service.getDocumentLock()).toBeInstanceOf(Lock);

    expect(scriptLock.hasLock()).toBe(false);
    expect(userLock.hasLock()).toBe(false);

    expect(scriptLock.tryLock(250)).toBe(true);
    expect(scriptLock.hasLock()).toBe(true);
    expect(userLock.hasLock()).toBe(false);

    const unavailable = createLockService(new StatefulLockBridge(false));
    expect(unavailable.getDocumentLock()).toBeNull();
  });
});

describe("Lock public contract", () => {
  test("report, acquire, and release lock state", () => {
    const lock = createLockService(new StatefulLockBridge()).getScriptLock();

    expect(lock.hasLock()).toBe(false);
    expect(lock.tryLock(250)).toBe(true);
    expect(lock.hasLock()).toBe(true);

    expect(lock.tryLock(250)).toBe(true);
    expect(lock.hasLock()).toBe(true);

    lock.releaseLock();
    expect(lock.hasLock()).toBe(false);

    expect(() => lock.releaseLock()).not.toThrow();
    expect(lock.hasLock()).toBe(false);
  });

  test("return false from tryLock and throw from waitLock when acquisition times out", () => {
    const service = createLockService(new StatefulLockBridge(true, false));
    const tryLock = service.getScriptLock();
    const waitLock = service.getUserLock();

    expect(tryLock.tryLock(100)).toBe(false);
    expect(tryLock.hasLock()).toBe(false);
    expect(() => waitLock.waitLock(100)).toThrow(Error);
    expect(waitLock.hasLock()).toBe(false);
  });

  test("acquire with waitLock when the lock becomes available", () => {
    const lock = createLockService(new StatefulLockBridge()).getScriptLock();

    expect(() => lock.waitLock(100)).not.toThrow();
    expect(lock.hasLock()).toBe(true);
  });
});
