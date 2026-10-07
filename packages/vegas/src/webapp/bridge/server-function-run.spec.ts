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
  test("dispatch server functions with configured handlers and user object", () => {
    const dispatch = vi.fn();
    const success = vi.fn();
    const failure = vi.fn();
    const userObject = { id: "button" };

    const run = createServerFunctionRun(dispatch)
      .withSuccessHandler(success)
      .withFailureHandler(failure)
      .withUserObject(userObject);

    invoke(run, "greet", "Vegas", 42);

    expect(dispatch).toHaveBeenCalledWith({
      functionName: "greet",
      args: ["Vegas", 42],
      handlers: {
        success,
        failure,
        userObject,
      },
    });
  });

  test("return a new runner when configuring callbacks and user objects", () => {
    const dispatch = vi.fn();
    const success = vi.fn();
    const userObject = { id: "configured" };
    const baseRun = createServerFunctionRun(dispatch);
    const configuredRun = baseRun.withSuccessHandler(success).withUserObject(userObject);

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
      handlers: { success, userObject },
    });
  });

  test("preserve an explicit null failure handler", () => {
    const dispatch = vi.fn();
    const run = createServerFunctionRun(dispatch).withFailureHandler(null);

    invoke(run, "silencedCall");

    expect(dispatch).toHaveBeenCalledWith({
      functionName: "silencedCall",
      args: [],
      handlers: { failure: null },
    });
  });
});
