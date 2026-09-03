import { expect, test, vi } from "vitest";

import { createConsole } from "./consoleFacade";

test("creates GAS-compatible console facade", () => {
  const write = vi.fn();
  const consoleValue = createConsole({ write }) as Record<string, unknown>;

  expect(Object.getPrototypeOf(consoleValue)).toBe(Object.prototype);
  expect(String(consoleValue as any)).toBe("console");

  expect(Object.getOwnPropertyNames(consoleValue).sort()).toEqual(
    ["error", "info", "log", "time", "timeEnd", "toString", "warn"].sort(),
  );

  for (const name of ["error", "info", "log", "warn"]) {
    expect(Object.getOwnPropertyDescriptor(consoleValue, name)).toMatchObject({
      configurable: true,
      enumerable: true,
      writable: false,
    });
  }

  for (const name of ["time", "timeEnd", "toString"]) {
    expect(Object.getOwnPropertyDescriptor(consoleValue, name)).toMatchObject({
      configurable: true,
      enumerable: true,
      writable: true,
    });
  }

  const log = consoleValue.log;
  expect(typeof log).toBe("function");

  Reflect.apply(log as (...args: unknown[]) => unknown, consoleValue, ["value"]);

  expect(write).toHaveBeenCalledOnce();

  const [method, prefix, value] = write.mock.lastCall ?? [];

  expect(method).toBe("debug");
  expect(prefix).toContain("console(GAS)");
  expect(value).toBe("value");
});
