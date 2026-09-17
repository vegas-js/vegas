import { describe, expect, test } from "vitest";

import type { InvocationEnvironment } from "../../runtime";
import { executeServerFunctionCall } from "./server-function-call";

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
      environment,
    );

    expect(response).toStrictEqual({
      requestId: 1,
      status: "err",
      message: "failed",
    });
  });
});
