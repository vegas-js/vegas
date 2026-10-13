import {
  isRuntimeErrorSnapshot,
  restoreRuntimeError,
  serializeRuntimeError,
  type RuntimeErrorSnapshot,
} from "../runtime-error";

export interface AppsScriptWorkerRequest {
  readonly type: "invoke";
  readonly functionName: string;
  readonly args: readonly unknown[];
}

export type AppsScriptWorkerError = RuntimeErrorSnapshot;

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

/** Validate and snapshot the worker request before executing user code. */
export function parseAppsScriptWorkerRequest(value: unknown): AppsScriptWorkerRequest | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  try {
    // Read each transport field once, without following prototypes or accessors.
    const type = getOwnDataValue(value, "type");
    const functionName = getOwnDataValue(value, "functionName");
    const args = getOwnDataValue(value, "args");
    if (type !== "invoke" || typeof functionName !== "string" || !Array.isArray(args)) {
      return undefined;
    }

    // The worker boundary owns the cloned argument values; snapshot the envelope.
    return { type: "invoke", functionName, args };
  } catch {
    // Revoked proxies and throwing reflection traps are invalid requests.
    return undefined;
  }
}

export function isAppsScriptWorkerRequest(value: unknown): value is AppsScriptWorkerRequest {
  return parseAppsScriptWorkerRequest(value) !== undefined;
}

export function isAppsScriptWorkerResponse(value: unknown): value is AppsScriptWorkerResponse {
  if (
    !isRecord(value) ||
    getOwnDataValue(value, "type") !== "result" ||
    typeof getOwnDataValue(value, "ok") !== "boolean"
  ) {
    return false;
  }

  if (getOwnDataValue(value, "ok") === true) {
    // An undefined result is valid, but it must be an explicit data field.
    const result = Object.getOwnPropertyDescriptor(value, "value");
    return result !== undefined && "value" in result;
  }

  const error = Object.getOwnPropertyDescriptor(value, "error");
  return error !== undefined && "value" in error && isRuntimeErrorSnapshot(error.value);
}

export function serializeAppsScriptWorkerError(error: unknown): AppsScriptWorkerError {
  return serializeRuntimeError(error);
}

export function restoreAppsScriptWorkerError(error: AppsScriptWorkerError): Error {
  return restoreRuntimeError(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getOwnDataValue(record: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}
