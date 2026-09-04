import { expect, test, vi } from "vitest";

import { createLogger } from "./loggerFacade";

type LoggerFacade = {
  clear(): null;
  getLog(): string;
  log(dataOrFormat: unknown, ...values: unknown[]): LoggerFacade;
};

test("creates GAS-compatible Logger facade", () => {
  const write = vi.fn();
  const logger = createLogger({ write }) as unknown as LoggerFacade & Record<string, unknown>;

  expect(Object.getPrototypeOf(logger)).toBe(Object.prototype);
  expect(String(logger as any)).toBe("Logger");

  expect(Object.getOwnPropertyNames(logger).sort()).toEqual(
    [
      "clear",
      "config",
      "fine",
      "finer",
      "finest",
      "getLog",
      "info",
      "log",
      "severe",
      "toString",
      "warning",
    ].sort(),
  );

  expect(Object.hasOwn(logger, "outputLogs")).toBe(false);

  for (const name of Object.getOwnPropertyNames(logger)) {
    const descriptor = Object.getOwnPropertyDescriptor(logger, name);

    expect(descriptor).toMatchObject({
      configurable: true,
      enumerable: true,
      writable: true,
    });
  }

  const returned = logger.log("value");

  expect(returned).not.toBe(logger);

  expect(String(returned as any)).toBe("Logger");

  expect(Object.getPrototypeOf(returned)).toBe(Object.prototype);

  expect(Object.getOwnPropertyNames(returned).sort()).toEqual(
    Object.getOwnPropertyNames(logger).sort(),
  );

  expect(logger.log("second")).toBe(returned);

  expect(returned.log("third")).toBe(returned);

  expect(returned.getLog()).toBe(logger.getLog());

  expect(write).toHaveBeenCalledTimes(3);
  expect(logger.getLog()).toContain("value");

  expect(logger.clear()).toBeNull();

  expect(logger.getLog()).toBe("");
});
