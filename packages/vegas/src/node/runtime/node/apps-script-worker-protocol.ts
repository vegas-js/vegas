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

  return isRuntimeErrorSnapshot(value.error);
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
