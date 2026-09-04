import { expect, test, vi } from "vitest";

import { Console } from "./console";

test("call injected sink", () => {
  const write = vi.fn();
  const logger = new Console({ write });
  logger.log("value");
  const [method, prefix, value] = write.mock.lastCall ?? ["", "", ""];

  expect(write).toHaveBeenCalledOnce();
  expect(method).toBe("debug");
  expect(prefix).toContain("console(GAS)");
  expect(value).toBe("value");
});

test.each([
  ["error", "error"],
  ["info", "info"],
  ["log", "debug"],
  ["warn", "warn"],
])("loglevel routing", (method, level) => {
  const write = vi.fn();
  const logger = new Console({ write });
  (logger as any)[method]();

  expect((write.mock.lastCall as any)[0]).toBe(level);
});

test("preserves characterized console timer semantics", () => {
  const write = vi.fn();

  const consoleValue = new Console({ write });

  expect(consoleValue.time("timer")).toBeNull();

  expect(consoleValue.timeEnd("timer")).toBeNull();

  expect(write).toHaveBeenCalledOnce();

  const [method, prefix, value] = write.mock.lastCall ?? [];

  expect(method).toBe("log");

  expect(prefix).toContain("Debug");

  expect(value).toMatch(/^timer: \d+ms$/);

  write.mockClear();

  expect(consoleValue.timeEnd("missing")).toBeNull();

  expect(write).not.toHaveBeenCalled();
});

test("rejects missing console timer labels with GAS Exceptions", () => {
  const consoleValue = new Console({
    write: vi.fn(),
  });

  for (const methodName of ["time", "timeEnd"] as const) {
    let thrown: unknown;

    try {
      Reflect.apply(consoleValue[methodName], consoleValue, []);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);

    expect((thrown as Error).name).toBe("Exception");

    expect((thrown as Error).message).toBe(
      `The parameters () don't match the method signature for console.${methodName}.`,
    );
  }
});
