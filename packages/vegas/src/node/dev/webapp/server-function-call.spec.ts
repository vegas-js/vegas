import { describe, expect, test } from "vitest";

import type { InvocationEnvironment, InvocationScope, Program } from "../../runtime";
import { executeServerFunctionCall } from "./server-function-call";

const program: Program = {
  source: "function hello() {}",
  htmlFiles: {},
};

const environment: InvocationEnvironment = {
  activeUserEmail: "active@example.com",
  activeUserLocale: "ja",
  effectiveUserEmail: "effective@example.com",
  scriptTimeZone: "Asia/Tokyo",
  temporaryActiveUserKey: "temporary-user-key",
};

const scope: InvocationScope = {
  scriptKey: "/project",
  userKey: "local-user",
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
            scope,
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
      scope,
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
      scope,
    );

    expect(response).toStrictEqual({
      requestId: 1,
      status: "err",
      message: "failed",
    });
  });
});
