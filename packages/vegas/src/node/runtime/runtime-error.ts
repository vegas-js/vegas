import {
  isRuntimeInfrastructureErrorKind,
  RuntimeInfrastructureError,
  type RuntimeInfrastructureErrorKind,
} from "./runtime-infrastructure-error";

export interface RuntimeErrorSnapshot {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  readonly infrastructureKind?: RuntimeInfrastructureErrorKind;
}

export function isRuntimeErrorSnapshot(value: unknown): value is RuntimeErrorSnapshot {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.message !== "string" ||
    (value.stack !== undefined && typeof value.stack !== "string")
  ) {
    return false;
  }

  return (
    value.infrastructureKind === undefined ||
    (value.name === "RuntimeInfrastructureError" &&
      isRuntimeInfrastructureErrorKind(value.infrastructureKind))
  );
}

export function serializeRuntimeError(error: unknown): RuntimeErrorSnapshot {
  if (isRecord(error)) {
    const name = typeof error.name === "string" && error.name.length > 0 ? error.name : "Error";

    return {
      name,
      message: getRuntimeErrorMessage(error),
      ...(typeof error.stack === "string" ? { stack: error.stack } : {}),
      ...(error instanceof RuntimeInfrastructureError ? { infrastructureKind: error.kind } : {}),
    };
  }

  return {
    name: "Error",
    message: String(error),
  };
}

export function restoreRuntimeError(error: RuntimeErrorSnapshot): Error {
  const restored =
    error.infrastructureKind === undefined
      ? createRuntimeError(error.name, error.message)
      : new RuntimeInfrastructureError(error.infrastructureKind, error.message);
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
      // RuntimeInfrastructureError has explicit transport metadata above. Other custom subclasses
      // and AggregateError fall back to Error while retaining the serialized name.
      return new Error(message);
    }
  }
}

function getRuntimeErrorMessage(error: Record<string, unknown>): string {
  if (typeof error.message === "string") {
    return error.message;
  }

  try {
    return JSON.stringify(error) ?? "Unknown error.";
  } catch {
    return "Unknown error.";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
