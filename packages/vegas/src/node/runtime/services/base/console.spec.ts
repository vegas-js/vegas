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
