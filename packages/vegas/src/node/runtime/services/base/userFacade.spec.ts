import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { createVmGasObjectFactory } from "../../globals/object";
import { createUser } from "./userFacade";

describe("createUser", () => {
  test("creates a User facade in the supplied VM realm", () => {
    const context = vm.createContext({});
    const createObject = createVmGasObjectFactory(context);

    const user = createUser("user@example.com", createObject);
    context.user = user;

    expect(vm.runInContext("Object.getPrototypeOf(user) === Object.prototype", context)).toBe(true);
  });

  test("creates GAS-compatible User own properties", () => {
    const user = createUser("user@example.com");

    expect(Object.getOwnPropertyNames(user).sort()).toEqual(
      ["getEmail", "getUserLoginId", "getUsername", "toString"].sort(),
    );

    for (const name of ["getEmail", "getUserLoginId", "getUsername", "toString"]) {
      expect(Object.getOwnPropertyDescriptor(user, name)).toMatchObject({
        configurable: true,
        enumerable: true,
        writable: true,
      });

      expect(typeof (user as unknown as Record<string, unknown>)[name]).toBe("function");
    }
  });

  test("preserves characterized User value behavior", () => {
    const user = createUser("user@example.com");

    expect(user.getEmail()).toBe("user@example.com");
    expect(String(user as any)).toBe("user@example.com");
  });

  test("creates a fresh object for each invocation", () => {
    const first = createUser("user@example.com");
    const second = createUser("user@example.com");

    expect(first).not.toBe(second);
  });
});
