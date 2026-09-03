import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { createVmGasObjectFactory } from "../../globals/object";
import type { RequestLegacySync } from "../../legacy/transport";
import { RuntimeScope } from "../../scope";
import { createLockFacade } from "./lockObjectFacade";

const requestLegacySync: RequestLegacySync = () => undefined;

describe("createLockFacade", () => {
  test("creates a Lock facade in the supplied VM realm", () => {
    const context = vm.createContext({});
    const createObject = createVmGasObjectFactory(context);

    const lock = createLockFacade(RuntimeScope.SCRIPT, requestLegacySync, createObject);

    context.lock = lock;

    expect(vm.runInContext("Object.getPrototypeOf(lock) === Object.prototype", context)).toBe(true);

    expect(vm.runInContext("lock.constructor === Object", context)).toBe(true);

    expect(Object.prototype.toString.call(lock)).toBe("[object Object]");
  });

  test("creates GAS-compatible Lock own properties", () => {
    const lock = createLockFacade(RuntimeScope.SCRIPT, requestLegacySync);

    const methodNames = ["hasLock", "releaseLock", "toString", "tryLock", "waitLock"];

    expect(Object.getOwnPropertyNames(lock).sort()).toEqual([...methodNames].sort());

    for (const name of methodNames) {
      expect(Object.getOwnPropertyDescriptor(lock, name)).toMatchObject({
        configurable: true,
        enumerable: true,
        writable: true,
      });

      expect(typeof (lock as unknown as Record<string, unknown>)[name]).toBe("function");
    }
  });

  test("preserves characterized Lock string conversion", () => {
    const lock = createLockFacade(RuntimeScope.SCRIPT, requestLegacySync);

    expect(String(lock as any)).toBe("Lock");
  });
});
