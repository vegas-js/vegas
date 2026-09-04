import { expect, test, vi } from "vitest";

import { Logger } from "./Logger";
import { createUser } from "./userFacade";

test("call injected sink", () => {
  const write = vi.fn();
  const logger = new Logger({ write });
  logger.log("value");
  const [method, prefix, value] = write.mock.lastCall ?? ["", "", ""];

  expect(write).toHaveBeenCalledOnce();
  expect(method).toBe("log");
  expect(prefix).toContain("Logger (GAS)");
  expect(value).toBe("value");
  expect(logger.getLog()).toContain("value");
});

test("formats GAS service objects using their GAS-visible string value", () => {
  const write = vi.fn();

  const logger = new Logger({
    write,
  });

  const user = createUser("active@example.invalid");

  logger.log(user as any);

  expect(write.mock.lastCall?.[2]).toBe("active@example.invalid");
});

test("getLog() preserves the characterized trailing newline", () => {
  const logger = new Logger({
    write: vi.fn(),
  });

  logger.log("first");
  logger.log("second");

  const log = logger.getLog();

  expect(log.endsWith("\n")).toBe(true);

  expect(log.split("\n").at(-1)).toBe("");
});
