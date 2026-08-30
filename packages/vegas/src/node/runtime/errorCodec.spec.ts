import { expect, test } from "vitest";

import { deserializeRuntimeError, serializeRuntimeError } from "./errorCodec";

test("serializes Error", () => {
  const error = new TypeError("invalid");
  const serialized = serializeRuntimeError(error);

  expect(serialized.name).toBe("TypeError");
  expect(serialized.message).toBe("invalid");
  expect(serialized.stack).toBe(error.stack);
});

test("serializes non-Error value", () => {
  expect(serializeRuntimeError("failure")).toEqual({
    name: "Error",
    message: "failure",
  });
});

test("deserializes runtime error", () => {
  const error = deserializeRuntimeError({
    name: "RangeError",
    message: "out of range",
    stack: "remote stack",
  });

  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe("RangeError");
  expect(error.message).toBe("out of range");
  expect(error.stack).toBe("remote stack");
});

test("round trips runtime error", () => {
  const source = new Error("boom");
  source.name = "CustomError";
  source.stack = "custom stack";

  const result = deserializeRuntimeError(serializeRuntimeError(source));

  expect(result.name).toBe("CustomError");
  expect(result.message).toBe("boom");
  expect(result.stack).toBe("custom stack");
});
