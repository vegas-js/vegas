import { describe, expect, test, vi } from "vitest";

import { createServerFunctionRun } from "./server-function-run";

function invoke(run: object, functionName: string, ...args: unknown[]): void {
  const fn: unknown = Reflect.get(run, functionName);

  if (typeof fn !== "function") {
    throw new Error(`${functionName} is not callable.`);
  }

  fn(...args);
}

describe("createServerFunctionRun", () => {
  test("dispatch server functions with configured handlers", () => {
    const dispatch = vi.fn();
    const success = vi.fn();
    const failure = vi.fn();

    const run = createServerFunctionRun(dispatch)
      .withSuccessHandler(success)
      .withFailureHandler(failure);

    invoke(run, "greet", "Vegas", 42);

    expect(dispatch).toHaveBeenCalledWith({
      functionName: "greet",
      args: ["Vegas", 42],
      handlers: {
        success,
        failure,
      },
    });
  });

  test("return a new runner when configuring a handler", () => {
    const dispatch = vi.fn();
    const success = vi.fn();
    const baseRun = createServerFunctionRun(dispatch);
    const configuredRun = baseRun.withSuccessHandler(success);

    invoke(baseRun, "baseCall");
    invoke(configuredRun, "configuredCall");

    expect(dispatch).toHaveBeenNthCalledWith(1, {
      functionName: "baseCall",
      args: [],
      handlers: {},
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      functionName: "configuredCall",
      args: [],
      handlers: { success },
    });
  });
});
