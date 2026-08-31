import { expect, test, vi } from "vitest";

import { Logger } from "./Logger";

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
