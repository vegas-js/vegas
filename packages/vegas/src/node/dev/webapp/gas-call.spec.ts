import { describe, expect, test } from "vitest";

import { executeGasCall } from "./gas-call";

describe("executeGasCall", () => {
  test("return successful response", async () => {
    const response = await executeGasCall(
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
    const response = await executeGasCall(
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
