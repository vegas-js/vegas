import { describe, expect, test } from "vitest";

import { executeServerFunctionCall } from "./server-function-call";

describe("executeServerFunctionCall", () => {
  test("return successful response", async () => {
    const controller = new AbortController();
    const response = await executeServerFunctionCall(
      {
        execute: async (request) => {
          expect(request).toStrictEqual({
            functionName: "hello",
            args: ["world"],
            signal: controller.signal,
          });

          return "result";
        },
      },
      {
        requestId: 1,
        functionName: "hello",
        args: ["world"],
      },
      controller.signal,
    );

    expect(response).toStrictEqual({
      requestId: 1,
      status: "ok",
      result: "result",
    });
  });

  test("omit the signal when none is provided", async () => {
    const response = await executeServerFunctionCall(
      {
        execute: async (request) => {
          expect(request).toStrictEqual({
            functionName: "hello",
            args: [],
          });

          return "result";
        },
      },
      {
        requestId: 1,
        functionName: "hello",
        args: [],
      },
    );

    expect(response.status).toBe("ok");
  });

  test("reject private server functions", async () => {
    const response = await executeServerFunctionCall(
      {
        execute: async () => {
          throw new Error("Private server function should not execute.");
        },
      },
      {
        requestId: 1,
        functionName: "secret_",
        args: [],
      },
    );

    expect(response).toStrictEqual({
      requestId: 1,
      status: "err",
      message: 'Server function "secret_" is private and cannot be called by google.script.run.',
    });
  });

  test("return failed response", async () => {
    const response = await executeServerFunctionCall(
      {
        execute: async () => {
          throw new Error("failed");
        },
      },
      {
        requestId: 1,
        functionName: "hello",
        args: [],
      },
    );

    expect(response).toStrictEqual({
      requestId: 1,
      status: "err",
      message: "failed",
    });
  });
});
