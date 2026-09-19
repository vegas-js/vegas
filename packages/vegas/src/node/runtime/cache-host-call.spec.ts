import { describe, expectTypeOf, test } from "vitest";

import { type CacheHostCall, type HostCallResult } from "./index";

describe("Cache host call result types", () => {
  test("map Cache host calls to operation-specific result types", () => {
    const getCall = {
      service: "cache",
      operation: "get",
      namespace: "script",
      key: "key",
    } satisfies CacheHostCall;
    const getAllCall = {
      service: "cache",
      operation: "getAll",
      namespace: "user",
      keys: ["first", "second"],
    } satisfies CacheHostCall;
    const putCall = {
      service: "cache",
      operation: "put",
      namespace: "script",
      key: "key",
      value: "value",
      expirationInSeconds: 600,
    } satisfies CacheHostCall;

    expectTypeOf<HostCallResult<typeof getCall>>().toEqualTypeOf<string | null>();
    expectTypeOf<HostCallResult<typeof getAllCall>>().toEqualTypeOf<Record<string, string>>();
    expectTypeOf<HostCallResult<typeof putCall>>().toEqualTypeOf<void>();
  });
});
