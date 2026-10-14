import { describe, expect, test, vi } from "vitest";

import {
  isRuntimeErrorSnapshot,
  restoreRuntimeError,
  serializeRuntimeError,
} from "./runtime-error";
import { RuntimeInfrastructureError } from "./runtime-infrastructure-error";
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

  test("reject inherited and accessor error fields without invoking getters", () => {
    const inherited = Object.assign(Object.create({ name: "Error" }) as Record<string, unknown>, {
      message: "failed",
    });
    expect(isRuntimeErrorSnapshot(inherited)).toBe(false);

    const validNullPrototype = Object.assign(Object.create(null) as Record<string, unknown>, {
      name: "Error",
      message: "failed",
    });
    expect(isRuntimeErrorSnapshot(validNullPrototype)).toBe(true);

    for (const field of [
      "name",
      "message",
      "stack",
      "infrastructureKind",
      "unsupportedOperation",
    ] as const) {
      const getter = vi.fn(() => "unsafe");
      const error = Object.defineProperty({ name: "Error", message: "failed" }, field, {
        get: getter,
      });
      expect(isRuntimeErrorSnapshot(error)).toBe(false);
      expect(getter).not.toHaveBeenCalled();
    }

    for (const field of ["operation", "reason"] as const) {
      const getter = vi.fn(() => "unsafe");
      const unsupportedOperation = Object.defineProperty(
        { operation: "Example.operation()", reason: "not modeled." },
        field,
        { get: getter },
      );
      expect(
        isRuntimeErrorSnapshot({
          name: "UnsupportedRuntimeOperationError",
          message: "failed",
          unsupportedOperation,
        }),
      ).toBe(false);
      expect(getter).not.toHaveBeenCalled();
    }
  });

  test("rejects error snapshots with throwing reflection traps", () => {
    const descriptorTrap = vi.fn((): never => {
      throw new Error("unexpected reflection");
    });
    const hostile = new Proxy({}, { getOwnPropertyDescriptor: descriptorTrap });
    expect(isRuntimeErrorSnapshot(hostile)).toBe(false);
    expect(descriptorTrap).toHaveBeenCalledOnce();

    const revocable = Proxy.revocable({ name: "Error", message: "failed" }, {});
    revocable.revoke();
    expect(isRuntimeErrorSnapshot(revocable.proxy)).toBe(false);

    const nested = new Proxy({}, { getOwnPropertyDescriptor: descriptorTrap });
    expect(
      isRuntimeErrorSnapshot({
        name: "UnsupportedRuntimeOperationError",
        message: "failed",
        unsupportedOperation: nested,
      }),
    ).toBe(false);
  });

  test("serializes thrown Proxies with failing traps as fallback errors", () => {
    const descriptorTrap = vi.fn((): never => {
      throw new Error("unexpected reflection");
    });
    const hostile = new Proxy({}, { getOwnPropertyDescriptor: descriptorTrap });
    expect(serializeRuntimeError(hostile)).toStrictEqual({
      name: "Error",
      message: "Unknown error.",
    });
    expect(descriptorTrap).toHaveBeenCalledOnce();

    const revocable = Proxy.revocable({}, {});
    revocable.revoke();
    expect(serializeRuntimeError(revocable.proxy)).toStrictEqual({
      name: "Error",
      message: "Unknown error.",
    });

    // Prototype inspection performed for Vegas-specific Error types can also throw.
    const prototypeTrap = vi.fn((): never => {
      throw new Error("unexpected prototype inspection");
    });
    const customPrototype = new Proxy({}, { getPrototypeOf: prototypeTrap });
    expect(serializeRuntimeError(customPrototype)).toStrictEqual({
      name: "Error",
      message: "Unknown error.",
    });
    expect(prototypeTrap).toHaveBeenCalled();
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

  test("does not coerce thrown functions through user-defined conversion hooks", () => {
    const getter = vi.fn(() => {
      throw new Error("unexpected coercion getter");
    });
    const functionValue = Object.defineProperty(() => "ignored", Symbol.toPrimitive, {
      get: getter,
    });

    expect(serializeRuntimeError(functionValue)).toStrictEqual({
      name: "Error",
      message: "Unknown error.",
    });
    expect(getter).not.toHaveBeenCalled();

    const toString = vi.fn(() => "unsafe");
    const customFunction = Object.assign(() => "ignored", { toString });
    expect(serializeRuntimeError(customFunction)).toStrictEqual({
      name: "Error",
      message: "Unknown error.",
    });
    expect(toString).not.toHaveBeenCalled();
  });

  test("serialize native errors without requiring own name properties", () => {
    const error = new TypeError("invalid");
    const snapshot = serializeRuntimeError(error);

    expect(snapshot).toMatchObject({ name: "TypeError", message: "invalid" });
    expect(snapshot.stack).toEqual(expect.any(String));
    expect(isRuntimeErrorSnapshot(snapshot)).toBe(true);
  });

  test("never invokes accessors on thrown errors or error-like values", () => {
    const getter = vi.fn(() => {
      throw new Error("unexpected getter call");
    });
    const error = new TypeError("invalid");
    Object.defineProperty(error, "name", { get: getter });
    Object.defineProperty(error, "stack", { get: getter });

    expect(serializeRuntimeError(error)).toStrictEqual({
      name: "Error",
      message: "invalid",
    });

    const thrown = Object.defineProperty({ name: "CustomError" }, "message", {
      enumerable: true,
      get: getter,
    });
    expect(serializeRuntimeError(thrown)).toStrictEqual({
      name: "CustomError",
      message: "Unknown error.",
    });
    expect(getter).not.toHaveBeenCalled();
  });

  test("does not format a native stack when an error name getter is overridden", () => {
    const getter = vi.fn(() => "unsafe");
    const error = new TypeError("invalid");
    Object.defineProperty(error, "name", { get: getter });

    expect(serializeRuntimeError(error)).toMatchObject({
      name: "Error",
      message: "invalid",
    });
    expect(getter).not.toHaveBeenCalled();
  });

  test("does not invoke a customized stack formatter", () => {
    const original = Object.getOwnPropertyDescriptor(Error, "prepareStackTrace");
    const formatter = vi.fn(() => "unsafe");
    try {
      Object.defineProperty(Error, "prepareStackTrace", {
        configurable: true,
        writable: true,
        value: formatter,
      });
      const snapshot = serializeRuntimeError(new TypeError("invalid"));
      expect(snapshot).toMatchObject({ name: "TypeError", message: "invalid" });
      expect(formatter).not.toHaveBeenCalled();
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(Error, "prepareStackTrace");
      } else {
        Object.defineProperty(Error, "prepareStackTrace", original);
      }
    }
  });

  test("preserves data-only JSON fallbacks without evaluating nested getters or toJSON", () => {
    expect(serializeRuntimeError({ code: "E_FAILED", detail: { ids: [1, 2] } })).toStrictEqual({
      name: "Error",
      message: '{"code":"E_FAILED","detail":{"ids":[1,2]}}',
    });

    const getter = vi.fn(() => "unsafe");
    const nested = Object.defineProperty({}, "secret", { enumerable: true, get: getter });
    expect(serializeRuntimeError({ nested })).toStrictEqual({
      name: "Error",
      message: "Unknown error.",
    });

    const toJSON = vi.fn(() => "unsafe");
    expect(serializeRuntimeError({ code: "E_FAILED", toJSON })).toStrictEqual({
      name: "Error",
      message: '{"code":"E_FAILED"}',
    });
    expect(getter).not.toHaveBeenCalled();
    expect(toJSON).not.toHaveBeenCalled();
  });

  test("does not attach Vegas error metadata when its name is overridden", () => {
    const infrastructure = new RuntimeInfrastructureError("backend", "failed");
    infrastructure.name = "CustomInfrastructureError";
    const infrastructureSnapshot = serializeRuntimeError(infrastructure);

    expect(infrastructureSnapshot).toMatchObject({
      name: "CustomInfrastructureError",
      message: "failed",
    });
    expect(infrastructureSnapshot).not.toHaveProperty("infrastructureKind");
    expect(isRuntimeErrorSnapshot(infrastructureSnapshot)).toBe(true);
    expect(restoreRuntimeError(infrastructureSnapshot)).toMatchObject({
      name: "CustomInfrastructureError",
      message: "failed",
    });

    const unsupported = new UnsupportedRuntimeOperationError("Example.operation()", "not modeled.");
    unsupported.name = "CustomUnsupportedError";
    const unsupportedSnapshot = serializeRuntimeError(unsupported);

    expect(unsupportedSnapshot).toMatchObject({
      name: "CustomUnsupportedError",
      message: unsupported.message,
    });
    expect(unsupportedSnapshot).not.toHaveProperty("unsupportedOperation");
    expect(isRuntimeErrorSnapshot(unsupportedSnapshot)).toBe(true);
  });

  test("does not attach inconsistent metadata when an error name is an accessor", () => {
    const getter = vi.fn(() => "unexpected");
    const error = new RuntimeInfrastructureError("backend", "failed");
    Object.defineProperty(error, "name", { get: getter });

    const snapshot = serializeRuntimeError(error);
    expect(snapshot).toMatchObject({ name: "Error", message: "failed" });
    expect(snapshot).not.toHaveProperty("infrastructureKind");
    expect(isRuntimeErrorSnapshot(snapshot)).toBe(true);
    expect(getter).not.toHaveBeenCalled();
  });

  test("does not execute overridden infrastructure metadata getters", () => {
    const getter = vi.fn(() => {
      throw new Error("unexpected getter call");
    });
    const error = new RuntimeInfrastructureError("backend", "failed");
    Object.defineProperty(error, "kind", { get: getter });
    expect(serializeRuntimeError(error)).toMatchObject({
      name: "RuntimeInfrastructureError",
      message: "failed",
    });
    expect(serializeRuntimeError(error).infrastructureKind).toBeUndefined();
    expect(getter).not.toHaveBeenCalled();
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

  test("preserve authentication infrastructure failures across transport", () => {
    const original = new RuntimeInfrastructureError(
      "authentication",
      "Google Apps Script authentication failed.",
    );
    const snapshot = serializeRuntimeError(original);

    expect(snapshot).toMatchObject({
      name: "RuntimeInfrastructureError",
      message: "Google Apps Script authentication failed.",
      infrastructureKind: "authentication",
    });

    const restored = restoreRuntimeError(snapshot);

    expect(restored).toBeInstanceOf(RuntimeInfrastructureError);
    expect(restored).toMatchObject({
      name: "RuntimeInfrastructureError",
      kind: "authentication",
      message: "Google Apps Script authentication failed.",
    });
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
