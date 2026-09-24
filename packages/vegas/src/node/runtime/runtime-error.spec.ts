import { describe, expect, test } from "vitest";

import {
  isRuntimeErrorSnapshot,
  restoreRuntimeError,
  serializeRuntimeError,
} from "./runtime-error";

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
