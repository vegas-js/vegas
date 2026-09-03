import { expect, test, vi } from "vitest";

import { createLogger } from "./loggerFacade";

type LoggerFacade = {
  clear(): void;
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

  expect(logger.log("value")).toBe(logger);

  expect(write).toHaveBeenCalledOnce();
  expect(logger.getLog()).toContain("value");

  logger.clear();

  expect(logger.getLog()).toBe("");
});
