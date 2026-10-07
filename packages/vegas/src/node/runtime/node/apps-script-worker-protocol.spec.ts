import { describe, expect, test } from "vitest";

import {
  isAppsScriptWorkerRequest,
  isAppsScriptWorkerResponse,
  restoreAppsScriptWorkerError,
  serializeAppsScriptWorkerError,
} from "./apps-script-worker-protocol";

describe("Apps Script worker protocol", () => {
  test("validate invocation requests", () => {
    expect(
      isAppsScriptWorkerRequest({
        type: "invoke",
        functionName: "main",
        args: ["value"],
      }),
    ).toBe(true);
    expect(
      isAppsScriptWorkerRequest({
        type: "invoke",
        functionName: "main",
        args: "value",
      }),
    ).toBe(false);
    expect(
      isAppsScriptWorkerRequest({
        type: "unknown",
        functionName: "main",
        args: [],
      }),
    ).toBe(false);
  });

  test("validate successful and failed results", () => {
    expect(
      isAppsScriptWorkerResponse({
        type: "result",
        ok: true,
        value: undefined,
      }),
    ).toBe(true);
    expect(
      isAppsScriptWorkerResponse({
        type: "result",
        ok: false,
        error: {
          name: "RangeError",
          message: "failed",
          stack: "worker stack",
        },
      }),
    ).toBe(true);
    expect(
      isAppsScriptWorkerResponse({
        id: 1,
        call: {
          service: "properties",
          operation: "get",
        },
      }),
    ).toBe(false);
  });

  test("serialize Error-like values across VM realms", () => {
    expect(
      serializeAppsScriptWorkerError({
        name: "RangeError",
        message: "out of range",
        stack: "worker stack",
      }),
    ).toStrictEqual({
      name: "RangeError",
      message: "out of range",
      stack: "worker stack",
    });
    expect(serializeAppsScriptWorkerError("failed")).toStrictEqual({
      name: "Error",
      message: "failed",
    });
    expect(serializeAppsScriptWorkerError({ code: "E_FAILED" })).toStrictEqual({
      name: "Error",
      message: '{"code":"E_FAILED"}',
    });
  });

  test("restore serialized worker errors", () => {
    const error = restoreAppsScriptWorkerError({
      name: "TypeError",
      message: "failed",
      stack: "worker stack",
    });

    expect(error).toBeInstanceOf(TypeError);
    expect(error.name).toBe("TypeError");
    expect(error.message).toBe("failed");
    expect(error.stack).toBe("worker stack");
  });
});
