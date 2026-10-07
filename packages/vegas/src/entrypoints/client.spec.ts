import { afterEach, describe, expect, test, vi } from "vitest";

import { createServerFunctionClient } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createServerFunctionClient", () => {
  test("calls server functions through google.script.run", async () => {
    let successHandler: (value: unknown) => void = () => undefined;
    let failureHandler: (reason?: unknown) => void = () => undefined;

    const run = {
      withSuccessHandler(handler: (value: unknown) => void) {
        successHandler = handler;
        return run;
      },

      withFailureHandler(handler: (reason?: unknown) => void) {
        failureHandler = handler;
        return run;
      },

      greet(name: string) {
        successHandler(`Hello, ${name}`);
      },

      fail() {
        failureHandler(new Error("server failure"));
      },
    };

    vi.stubGlobal("google", {
      script: {
        run,
      },
    });

    const client = createServerFunctionClient<{
      greet(name: string): string;
      fail(): string;
    }>();

    await expect(client.greet("Vegas")).resolves.toBe("Hello, Vegas");
    await expect(client.fail()).rejects.toThrow("server failure");
  });
});
