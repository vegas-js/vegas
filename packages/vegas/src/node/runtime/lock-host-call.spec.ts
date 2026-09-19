import { describe, expectTypeOf, test } from "vitest";

import { type HostCallResult, type LockHostCall } from "./index";

describe("Lock host call result types", () => {
  test("map Lock host calls to operation-specific result types", () => {
    const acquireCall = {
      service: "lock",
      operation: "acquire",
      namespace: "script",
      timeoutInMillis: 1_000,
    } satisfies LockHostCall;
    const hasCall = {
      service: "lock",
      operation: "has",
      namespace: "user",
    } satisfies LockHostCall;
    const releaseCall = {
      service: "lock",
      operation: "release",
      namespace: "script",
    } satisfies LockHostCall;

    expectTypeOf<HostCallResult<typeof acquireCall>>().toEqualTypeOf<boolean>();
    expectTypeOf<HostCallResult<typeof hasCall>>().toEqualTypeOf<boolean>();
    expectTypeOf<HostCallResult<typeof releaseCall>>().toEqualTypeOf<void>();
  });
});
