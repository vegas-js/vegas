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

/** Snapshot the result envelope and error before the host consumes either. */
export function parseAppsScriptWorkerResponse(
  value: unknown,
): AppsScriptWorkerResponse | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  try {
    const type = getOwnDataValue(value, "type");
    const ok = getOwnDataValue(value, "ok");
    if (type !== "result" || typeof ok !== "boolean") {
      return undefined;
    }

    if (ok) {
      // An undefined result is valid, but it must be an explicit data field.
      const result = Object.getOwnPropertyDescriptor(value, "value");
      return result !== undefined && "value" in result
        ? { type: "result", ok: true, value: result.value }
        : undefined;
    }

    const error = snapshotAppsScriptWorkerError(getOwnDataValue(value, "error"));
    return error === undefined ? undefined : { type: "result", ok: false, error };
  } catch {
    // Reject revoked proxies and throwing reflection traps as protocol errors.
    return undefined;
  }
}

export function isAppsScriptWorkerResponse(value: unknown): value is AppsScriptWorkerResponse {
  return parseAppsScriptWorkerResponse(value) !== undefined;
}

function snapshotAppsScriptWorkerError(value: unknown): RuntimeErrorSnapshot | undefined {
  if (!isRuntimeErrorSnapshot(value)) {
    return undefined;
  }

  const name = getOwnDataValue(value, "name");
  const message = getOwnDataValue(value, "message");
  const stack = getOwnDataValue(value, "stack");
  const infrastructureKind = getOwnDataValue(value, "infrastructureKind");
  const unsupported = getOwnDataValue(value, "unsupportedOperation");
  let unsupportedOperation: unknown;
  if (unsupported !== undefined) {
    if (!isRecord(unsupported)) {
      return undefined;
    }
    unsupportedOperation = {
      operation: getOwnDataValue(unsupported, "operation"),
      reason: getOwnDataValue(unsupported, "reason"),
    };
  }

  // A Proxy may change descriptors between validation and copying. Revalidate
  // the independent snapshot so the restorer never observes untrusted getters.
  const snapshot = {
    name,
    message,
    ...(stack !== undefined ? { stack } : {}),
    ...(infrastructureKind !== undefined ? { infrastructureKind } : {}),
    ...(unsupportedOperation !== undefined ? { unsupportedOperation } : {}),
  };
  return isRuntimeErrorSnapshot(snapshot) ? snapshot : undefined;
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

function getOwnDataValue(record: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}
