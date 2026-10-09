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

export function isAppsScriptWorkerRequest(value: unknown): value is AppsScriptWorkerRequest {
  return (
    isRecord(value) &&
    // Messages must supply their own data fields. Do not invoke inherited
    // members or getters while validating an unexpected worker payload.
    getOwnDataValue(value, "type") === "invoke" &&
    typeof getOwnDataValue(value, "functionName") === "string" &&
    Array.isArray(getOwnDataValue(value, "args"))
  );
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
