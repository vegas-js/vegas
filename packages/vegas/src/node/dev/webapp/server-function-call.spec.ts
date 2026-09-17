import { describe, expect, test } from "vitest";

import type { InvocationEnvironment, Program } from "../../runtime";
import { executeServerFunctionCall } from "./server-function-call";

const program: Program = {
  source: "function hello() {}",
};

const environment: InvocationEnvironment = {
  activeUserEmail: "active@example.com",
  activeUserLocale: "ja",
  effectiveUserEmail: "effective@example.com",
  scriptTimeZone: "Asia/Tokyo",
  temporaryActiveUserKey: "temporary-user-key",
};

describe("executeServerFunctionCall", () => {
  test("return successful response", async () => {
    const response = await executeServerFunctionCall(
      {
        execute: async (request) => {
          expect(request).toStrictEqual({
            program,
            functionName: "hello",
            args: ["world"],
            environment,
          });

          return "result";
        },
      },
      {
        requestId: 1,
        functionName: "hello",
        args: ["world"],
      },
      program,
      environment,
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
      program,
      environment,
    );

    expect(response).toStrictEqual({
      requestId: 1,
      status: "err",
      message: "failed",
    });
  });
});
