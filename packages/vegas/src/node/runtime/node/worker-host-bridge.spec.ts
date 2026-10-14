import { describe, expect, test, vi } from "vitest";

import type { HostRequestMessage } from "../host-protocol";
import { RuntimeInfrastructureError } from "../runtime-infrastructure-error";
import { UnsupportedRuntimeOperationError } from "../unsupported-runtime-operation-error";
import { readHostResponse } from "./worker-host-bridge";

const request = {
  id: 1,
  call: {
    service: "properties",
    operation: "get",
    namespace: "script",
    key: "environment",
  },
} satisfies HostRequestMessage;

describe("readHostResponse", () => {
  test("accept own success fields and preserve an explicit undefined value", () => {
    expect(readHostResponse(request, { id: 1, ok: true, value: "Vegas" })).toBe("Vegas");
    expect(readHostResponse(request, { id: 1, ok: true, value: undefined })).toBeUndefined();
    expect(() => readHostResponse(request, { id: 1, ok: true })).toThrow(
      "Host response 1 is missing or invalid.",
    );
  });

  test("reject inherited and accessor response fields without invoking getters", () => {
    for (const field of ["id", "ok", "value", "error"] as const) {
      const getter = vi.fn(() => {
        throw new Error("unexpected getter invocation");
      });
      const response = Object.defineProperty(
        field === "error"
          ? { id: 1, ok: false, error: { name: "Error", message: "failed", type: "Error" } }
          : { id: 1, ok: true, value: "value" },
        field,
        { get: getter },
      );
      expect(() => readHostResponse(request, response)).toThrow(
        "Host response 1 is missing or invalid.",
      );
      expect(getter).not.toHaveBeenCalled();
    }

    const inherited = Object.assign(Object.create({ id: 1 }) as Record<string, unknown>, {
      ok: true,
      value: "result",
    });
    expect(() => readHostResponse(request, inherited)).toThrow(
      "Host response 1 is missing or invalid.",
    );
  });

  test("reject invalid IDs, revoked proxies and throwing reflection traps", () => {
    for (const id of [0, -1, 1.5, NaN, Infinity]) {
      expect(() => readHostResponse(request, { id, ok: true, value: "result" })).toThrow(
        "Host response 1 is missing or invalid.",
      );
    }

    const revoked = Proxy.revocable({ id: 1, ok: true, value: "value" }, {});
    revoked.revoke();
    expect(() => readHostResponse(request, revoked.proxy)).toThrow(
      "Host response 1 is missing or invalid.",
    );

    const hostile = new Proxy(
      { id: 1, ok: true, value: "value" },
      {
        getOwnPropertyDescriptor() {
          throw new Error("unexpected reflection failure");
        },
      },
    );
    expect(() => readHostResponse(request, hostile)).toThrow(
      "Host response 1 is missing or invalid.",
    );
  });

  test("reject accessor host error data while preserving custom error metadata", () => {
    const getter = vi.fn(() => "unsafe");
    const error = Object.defineProperty(
      { name: "TypeError", message: "failed", type: "TypeError" },
      "type",
      { get: getter },
    );
    expect(() => readHostResponse(request, { id: 1, ok: false, error })).toThrow(
      "Host response 1 is missing or invalid.",
    );
    expect(getter).not.toHaveBeenCalled();

    expect(() =>
      readHostResponse(request, {
        id: 1,
        ok: false,
        error: {
          name: "RuntimeInfrastructureError",
          message: "host disconnected",
          type: "RuntimeInfrastructureError",
          infrastructureKind: "backend",
        },
      }),
    ).toThrow(RuntimeInfrastructureError);

    expect(() =>
      readHostResponse(request, {
        id: 1,
        ok: false,
        error: {
          name: "UnsupportedRuntimeOperationError",
          message: "unavailable",
          type: "UnsupportedRuntimeOperationError",
          unsupportedOperation: { operation: "Cache.get", reason: "unavailable" },
        },
      }),
    ).toThrow(UnsupportedRuntimeOperationError);
  });
  test("restore host errors with their built-in class and host type", () => {
    let caught: unknown;

    try {
      readHostResponse(request, {
        id: 1,
        ok: false,
        error: {
          name: "RangeError",
          type: "RangeError",
          message: "out of range",
          stack: "host stack",
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(RangeError);
    expect(caught).toMatchObject({
      name: "RangeError",
      type: "RangeError",
      message: "out of range",
      stack: "host stack",
    });
  });
});
