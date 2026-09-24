import { describe, expect, test } from "vitest";

import {
  isRuntimeErrorSnapshot,
  restoreRuntimeError,
  serializeRuntimeError,
} from "./runtime-error";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

describe("Runtime error transport", () => {
  test("validate serialized errors", () => {
    expect(
      isRuntimeErrorSnapshot({
        name: "TypeError",
        message: "failed",
        stack: "runtime stack",
      }),
    ).toBe(true);
    expect(
      isRuntimeErrorSnapshot({
        name: "TypeError",
        message: 1,
      }),
    ).toBe(false);
    expect(
      isRuntimeErrorSnapshot({
        name: "UnsupportedRuntimeOperationError",
        message: "failed",
        unsupportedOperation: {
          operation: "Example.operation()",
          reason: "not modeled.",
        },
      }),
    ).toBe(true);
    expect(
      isRuntimeErrorSnapshot({
        name: "Error",
        message: "failed",
        unsupportedOperation: {
          operation: "Example.operation()",
          reason: "not modeled.",
        },
      }),
    ).toBe(false);
  });

  test("serialize Error-like values across VM realms", () => {
    expect(
      serializeRuntimeError({
        name: "RangeError",
        message: "out of range",
        stack: "runtime stack",
      }),
    ).toStrictEqual({
      name: "RangeError",
      message: "out of range",
      stack: "runtime stack",
    });
    expect(serializeRuntimeError("failed")).toStrictEqual({
      name: "Error",
      message: "failed",
    });
    expect(serializeRuntimeError({ code: "E_FAILED" })).toStrictEqual({
      name: "Error",
      message: '{"code":"E_FAILED"}',
    });

    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(serializeRuntimeError(circular)).toStrictEqual({
      name: "Error",
      message: "Unknown error.",
    });
  });

  test.each([
    ["EvalError", EvalError],
    ["RangeError", RangeError],
    ["ReferenceError", ReferenceError],
    ["SyntaxError", SyntaxError],
    ["TypeError", TypeError],
    ["URIError", URIError],
  ] as const)("restore %s as its built-in error class", (name, ErrorClass) => {
    const error = restoreRuntimeError({
      name,
      message: "failed",
      stack: "runtime stack",
    });

    expect(error).toBeInstanceOf(ErrorClass);
    expect(error.name).toBe(name);
    expect(error.message).toBe("failed");
    expect(error.stack).toBe("runtime stack");
  });

  test("preserve intentional Local Runtime limitations across transport", () => {
    const original = new UnsupportedRuntimeOperationError(
      "Example.operation()",
      "the required local capability is unavailable.",
    );
    const snapshot = serializeRuntimeError(original);

    expect(snapshot).toMatchObject({
      name: "UnsupportedRuntimeOperationError",
      message:
        "Local Runtime does not support Example.operation(): the required local capability is unavailable.",
      unsupportedOperation: {
        operation: "Example.operation()",
        reason: "the required local capability is unavailable.",
      },
    });

    const restored = restoreRuntimeError(snapshot);

    expect(restored).toBeInstanceOf(UnsupportedRuntimeOperationError);
    expect(restored).toMatchObject({
      name: "UnsupportedRuntimeOperationError",
      operation: "Example.operation()",
      reason: "the required local capability is unavailable.",
      message:
        "Local Runtime does not support Example.operation(): the required local capability is unavailable.",
    });
  });

  test("preserve unknown error names without inventing a subclass", () => {
    const error = restoreRuntimeError({
      name: "CustomError",
      message: "failed",
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.constructor).toBe(Error);
    expect(error.name).toBe("CustomError");
  });
});
