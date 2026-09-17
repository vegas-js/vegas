import { describe, expect, expectTypeOf, test } from "vitest";

import type {
  HostBridge,
  HostCallResult,
  HostRequestMessage,
  HostResponseMessage,
  PropertiesHostCall,
} from "./index";

describe("HostBridge", () => {
  test("map semantic calls to operation-specific result types", () => {
    const getCall = {
      service: "properties",
      operation: "get",
      namespace: "script",
      key: "name",
    } satisfies PropertiesHostCall;
    const getAllCall = {
      service: "properties",
      operation: "getAll",
      namespace: "script",
    } satisfies PropertiesHostCall;
    const getKeysCall = {
      service: "properties",
      operation: "getKeys",
      namespace: "script",
    } satisfies PropertiesHostCall;
    const setCall = {
      service: "properties",
      operation: "set",
      namespace: "script",
      key: "name",
      value: "Vegas",
    } satisfies PropertiesHostCall;

    expectTypeOf<HostCallResult<typeof getCall>>().toEqualTypeOf<string | null>();
    expectTypeOf<HostCallResult<typeof getAllCall>>().toEqualTypeOf<Record<string, string>>();
    expectTypeOf<HostCallResult<typeof getKeysCall>>().toEqualTypeOf<string[]>();
    expectTypeOf<HostCallResult<typeof setCall>>().toEqualTypeOf<void>();

    expectTypeOf<HostBridge["call"]>().toBeFunction();
  });

  test("keep semantic call separate from transport metadata", () => {
    const request: HostRequestMessage = {
      id: 7,
      call: {
        service: "properties",
        operation: "get",
        namespace: "user",
        key: "theme",
      },
    };

    expect(request).toStrictEqual({
      id: 7,
      call: {
        service: "properties",
        operation: "get",
        namespace: "user",
        key: "theme",
      },
    });
  });

  test("correlate success and failure responses by request id", () => {
    const success: HostResponseMessage<string | null> = {
      id: 11,
      ok: true,
      value: "dark",
    };
    const failure: HostResponseMessage<string | null> = {
      id: 11,
      ok: false,
      error: {
        name: "Error",
        type: "DriveError",
        message: "failed",
        stack: "stack",
      },
    };

    expect(success).toStrictEqual({
      id: 11,
      ok: true,
      value: "dark",
    });
    expect(failure).toStrictEqual({
      id: 11,
      ok: false,
      error: {
        name: "Error",
        type: "DriveError",
        message: "failed",
        stack: "stack",
      },
    });
  });
});
