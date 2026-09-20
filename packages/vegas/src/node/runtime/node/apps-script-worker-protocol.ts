export interface AppsScriptWorkerRequest {
  readonly type: "invoke";
  readonly functionName: string;
  readonly args: readonly unknown[];
}

export interface AppsScriptWorkerError {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
}

export type AppsScriptWorkerResponse =
  | {
      readonly type: "result";
      readonly ok: true;
      readonly value: unknown;
    }
  | {
      readonly type: "result";
      readonly ok: false;
      readonly error: AppsScriptWorkerError;
    };

export function isAppsScriptWorkerRequest(value: unknown): value is AppsScriptWorkerRequest {
  return (
    isRecord(value) &&
    value.type === "invoke" &&
    typeof value.functionName === "string" &&
    Array.isArray(value.args)
  );
}

export function isAppsScriptWorkerResponse(value: unknown): value is AppsScriptWorkerResponse {
  if (!isRecord(value) || value.type !== "result" || typeof value.ok !== "boolean") {
    return false;
  }

  if (value.ok) {
    return Object.hasOwn(value, "value");
  }

  return isAppsScriptWorkerError(value.error);
}

export function serializeAppsScriptWorkerError(error: unknown): AppsScriptWorkerError {
  if (isRecord(error)) {
    const name = typeof error.name === "string" && error.name.length > 0 ? error.name : "Error";
    const message = typeof error.message === "string" ? error.message : String(error);

    return {
      name,
      message,
      ...(typeof error.stack === "string" ? { stack: error.stack } : {}),
    };
  }

  return {
    name: "Error",
    message: String(error),
  };
}

export function restoreAppsScriptWorkerError(error: AppsScriptWorkerError): Error {
  const restored = new Error(error.message);
  restored.name = error.name;

  if (error.stack !== undefined) {
    restored.stack = error.stack;
  }

  return restored;
}

function isAppsScriptWorkerError(value: unknown): value is AppsScriptWorkerError {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.message === "string" &&
    (value.stack === undefined || typeof value.stack === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
