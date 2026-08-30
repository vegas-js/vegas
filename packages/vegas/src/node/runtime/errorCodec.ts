import type { RuntimeSerializedError } from "./protocol";

export function serializeRuntimeError(error: unknown): RuntimeSerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "Error",
    message: String(error),
  };
}

export function deserializeRuntimeError(serialized: RuntimeSerializedError): Error {
  const error = new Error(serialized.message);
  error.name = serialized.name;

  if (serialized.stack) {
    error.stack = serialized.stack;
  }

  return error;
}
