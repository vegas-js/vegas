import {
  isRuntimeInfrastructureErrorKind,
  RuntimeInfrastructureError,
  type RuntimeInfrastructureErrorKind,
} from "./runtime-infrastructure-error";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

// In V8, native Error stacks are lazy accessors rather than data properties.
// Compare against the realm's original accessor: never call an arbitrary getter.
const nativeStackDescriptor = Object.getOwnPropertyDescriptor(new Error(), "stack");
// Node may install its own ErrorPrepareStackTrace; retain that trusted baseline.
const nativeStackFormatter = Object.getOwnPropertyDescriptor(Error, "prepareStackTrace");

interface UnsupportedRuntimeOperationSnapshot {
  readonly operation: string;
  readonly reason: string;
}

export interface RuntimeErrorSnapshot {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  readonly infrastructureKind?: RuntimeInfrastructureErrorKind;
  readonly unsupportedOperation?: UnsupportedRuntimeOperationSnapshot;
}

export function isRuntimeErrorSnapshot(value: unknown): value is RuntimeErrorSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  // Serialized errors must contain own data fields, never inherited values or
  // accessors. This validator must not run code supplied by an invalid payload.
  const name = Object.getOwnPropertyDescriptor(value, "name");
  const message = Object.getOwnPropertyDescriptor(value, "message");
  const stack = Object.getOwnPropertyDescriptor(value, "stack");
  const infrastructureKind = Object.getOwnPropertyDescriptor(value, "infrastructureKind");
  const unsupportedOperation = Object.getOwnPropertyDescriptor(value, "unsupportedOperation");
  if (
    !name ||
    !("value" in name) ||
    typeof name.value !== "string" ||
    !message ||
    !("value" in message) ||
    typeof message.value !== "string" ||
    (stack !== undefined &&
      (!("value" in stack) || (stack.value !== undefined && typeof stack.value !== "string"))) ||
    (infrastructureKind !== undefined && !("value" in infrastructureKind)) ||
    (unsupportedOperation !== undefined && !("value" in unsupportedOperation))
  ) {
    return false;
  }

  if (infrastructureKind?.value !== undefined) {
    return (
      unsupportedOperation?.value === undefined &&
      name.value === "RuntimeInfrastructureError" &&
      isRuntimeInfrastructureErrorKind(infrastructureKind.value)
    );
  }

  if (unsupportedOperation?.value !== undefined) {
    return (
      name.value === "UnsupportedRuntimeOperationError" &&
      isUnsupportedRuntimeOperationSnapshot(unsupportedOperation.value)
    );
  }

  return true;
}

export function serializeRuntimeError(error: unknown): RuntimeErrorSnapshot {
  if (isRecord(error)) {
    // An application may throw an arbitrary object, including one with accessors.
    // Serializing the failure must never evaluate those accessors in the worker.
    const originalName = readDataProperty(error, "name");
    const name =
      typeof originalName === "string" && originalName.length > 0 ? originalName : "Error";
    const stack = readSafeErrorStack(error);
    const infrastructureKind =
      error instanceof RuntimeInfrastructureError ? readDataProperty(error, "kind") : undefined;
    const operation =
      error instanceof UnsupportedRuntimeOperationError
        ? readDataProperty(error, "operation")
        : undefined;
    const reason =
      error instanceof UnsupportedRuntimeOperationError
        ? readDataProperty(error, "reason")
        : undefined;

    return {
      name,
      message: getRuntimeErrorMessage(error),
      ...(typeof stack === "string" ? { stack } : {}),
      ...(isRuntimeInfrastructureErrorKind(infrastructureKind) ? { infrastructureKind } : {}),
      ...(typeof operation === "string" && typeof reason === "string"
        ? { unsupportedOperation: { operation, reason } }
        : {}),
    };
  }

  return {
    name: "Error",
    message: String(error),
  };
}

export function restoreRuntimeError(error: RuntimeErrorSnapshot): Error {
  let restored: Error;

  if (error.infrastructureKind !== undefined) {
    restored = new RuntimeInfrastructureError(error.infrastructureKind, error.message);
  } else if (error.unsupportedOperation !== undefined) {
    restored = new UnsupportedRuntimeOperationError(
      error.unsupportedOperation.operation,
      error.unsupportedOperation.reason,
    );
  } else {
    restored = createRuntimeError(error.name, error.message);
  }

  restored.name = error.name;

  if (error.stack !== undefined) {
    restored.stack = error.stack;
  }

  return restored;
}

function createRuntimeError(name: string, message: string): Error {
  switch (name) {
    case "EvalError": {
      return new EvalError(message);
    }
    case "RangeError": {
      return new RangeError(message);
    }
    case "ReferenceError": {
      return new ReferenceError(message);
    }
    case "SyntaxError": {
      return new SyntaxError(message);
    }
    case "TypeError": {
      return new TypeError(message);
    }
    case "URIError": {
      return new URIError(message);
    }
    default: {
      // Vegas runtime errors with semantic transport metadata are restored above. Other custom
      // subclasses and AggregateError fall back to Error while retaining the serialized name.
      return new Error(message);
    }
  }
}

function getRuntimeErrorMessage(error: Record<string, unknown>): string {
  const message = readDataProperty(error, "message");
  if (typeof message === "string") {
    return message;
  }

  try {
    // JSON.stringify() itself calls getters and toJSON(). Snapshot only own,
    // enumerable data fields before using JSON as a fallback error message.
    return JSON.stringify(copyJsonData(error, new WeakSet<object>())) ?? "Unknown error.";
  } catch {
    return "Unknown error.";
  }
}

function readDataProperty(value: object, key: string): unknown {
  let current: object | null = value;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor !== undefined) {
      return "value" in descriptor ? descriptor.value : undefined;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  return undefined;
}

function readSafeErrorStack(error: Record<string, unknown>): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(error, "stack");
  if (descriptor === undefined || "value" in descriptor) {
    return readDataProperty(error, "stack");
  }

  // V8 lazily computes the stack via an accessor shared by native Errors in
  // this realm. Do not run user-supplied accessors, even on Error instances.
  if (
    nativeStackDescriptor?.get === undefined ||
    descriptor.get !== nativeStackDescriptor.get ||
    !(error instanceof Error) ||
    hasUnsafeErrorFormattingField(error, "name") ||
    hasUnsafeErrorFormattingField(error, "message") ||
    hasCustomStackFormatter()
  ) {
    return undefined;
  }

  try {
    return nativeStackDescriptor.get.call(error);
  } catch {
    return undefined;
  }
}

function hasUnsafeErrorFormattingField(value: object, key: string): boolean {
  let current: object | null = value;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor !== undefined) {
      return (
        !("value" in descriptor) ||
        (descriptor.value !== undefined && typeof descriptor.value !== "string")
      );
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  return false;
}

function hasCustomStackFormatter(): boolean {
  const current = Object.getOwnPropertyDescriptor(Error, "prepareStackTrace");
  if (nativeStackFormatter === undefined) {
    return current !== undefined;
  }
  return (
    current === undefined ||
    !("value" in current) ||
    !("value" in nativeStackFormatter) ||
    current.value !== nativeStackFormatter.value
  );
}

function copyJsonData(value: unknown, active: WeakSet<object>): unknown {
  // Never carry executable toJSON functions into the JSON fallback.
  if (typeof value === "function") {
    return undefined;
  }
  if (!isRecord(value)) {
    return value;
  }
  if (active.has(value)) {
    throw new TypeError("Cyclic error value.");
  }

  active.add(value);
  try {
    const copy: object = Array.isArray(value)
      ? Array.from<unknown>({ length: value.length })
      : (Object.create(null) as Record<string, unknown>);
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new TypeError("Accessor in error value.");
      }
      Object.defineProperty(copy, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: copyJsonData(descriptor.value, active),
      });
    }
    return copy;
  } finally {
    active.delete(value);
  }
}

function isUnsupportedRuntimeOperationSnapshot(
  value: unknown,
): value is UnsupportedRuntimeOperationSnapshot {
  return (
    isRecord(value) &&
    typeof Object.getOwnPropertyDescriptor(value, "operation")?.value === "string" &&
    typeof Object.getOwnPropertyDescriptor(value, "reason")?.value === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
