import { describe, expect, test } from "vitest";

import { executeServerFunctionCall } from "./server-function-call";

describe("executeServerFunctionCall", () => {
  test("return successful response", async () => {
    const response = await executeServerFunctionCall(
      {
        execute: async (request) => {
          expect(request).toStrictEqual({
            functionName: "hello",
            args: ["world"],
          });

          return "result";
        },
      },
      {
        requestId: 1,
        functionName: "hello",
        args: ["world"],
      },
    );

    expect(response).toStrictEqual({
      requestId: 1,
      status: "ok",
      result: "result",
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
