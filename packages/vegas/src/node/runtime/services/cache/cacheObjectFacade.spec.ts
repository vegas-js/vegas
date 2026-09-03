import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { createVmGasObjectFactory } from "../../globals/object";
import type { RuntimeServicePort } from "../../protocol";
import { RuntimeScope } from "../../scope";
import { createCacheFacade } from "./cacheObjectFacade";

const service: RuntimeServicePort<"Cache"> = {
  get: () => null,
  getAll: () => ({}),
  put: () => null,
  putAll: () => null,
  remove: () => null,
  removeAll: () => null,
};

describe("createCacheFacade", () => {
  test("creates a Cache facade in the supplied VM realm", () => {
    const context = vm.createContext({});
    const createObject = createVmGasObjectFactory(context);

    const cache = createCacheFacade(RuntimeScope.SCRIPT, "ScriptCache", service, createObject);

    context.cache = cache;

    expect(vm.runInContext("Object.getPrototypeOf(cache) === Object.prototype", context)).toBe(
      true,
    );

    expect(vm.runInContext("cache.constructor === Object", context)).toBe(true);

    expect(Object.prototype.toString.call(cache)).toBe("[object Object]");
  });

  test("creates GAS-compatible Cache own properties", () => {
    const cache = createCacheFacade(RuntimeScope.SCRIPT, "ScriptCache", service);

    const methodNames = ["get", "getAll", "put", "putAll", "remove", "removeAll", "toString"];

    expect(Object.getOwnPropertyNames(cache).sort()).toEqual([...methodNames].sort());

    for (const name of methodNames) {
      expect(Object.getOwnPropertyDescriptor(cache, name)).toMatchObject({
        configurable: true,
        enumerable: true,
        writable: true,
      });

      expect(typeof (cache as unknown as Record<string, unknown>)[name]).toBe("function");
    }
  });

  test("preserves characterized Cache string conversion", () => {
    const scriptCache = createCacheFacade(RuntimeScope.SCRIPT, "ScriptCache", service);

    const userCache = createCacheFacade(RuntimeScope.USER, "UserCache", service);

    expect(String(scriptCache as any)).toBe("ScriptCache");
    expect(String(userCache as any)).toBe("UserCache");
  });
});
