import type { RuntimeBackend, RuntimeExecutionRequest } from "../executor";
import { restoreRuntimeError } from "../runtime-error";
import { RuntimeInfrastructureError } from "../runtime-infrastructure-error";

export const DEFAULT_GOOGLE_APPS_SCRIPT_REQUEST_TIMEOUT_MS = 380_000;
export const GOOGLE_APPS_SCRIPT_ACCESS_TOKEN_MINIMUM_VALIDITY_MS = 6 * 60 * 1_000;

type GoogleAppsScriptApiValue =
  | null
  | boolean
  | number
  | string
  | GoogleAppsScriptApiValue[]
  | { readonly [key: string]: GoogleAppsScriptApiValue };

export interface GoogleAppsScriptRuntimeOptions {
  readonly scriptId: string;
  readonly acquireAccessToken: (minimumValidityMs: number, signal?: AbortSignal) => Promise<string>;
  readonly devMode?: boolean;
  readonly requestTimeoutMs?: number;
  readonly fetch?: typeof globalThis.fetch;
}

function requireRequestTimeout(timeoutMs: number): number {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError("Google Apps Script request timeout must be a positive integer.");
  }

  return timeoutMs;
}

function failSerialization(reason: string): never {
  throw new RuntimeInfrastructureError(
    "serialization",
    `Google Apps Script API parameters are not serializable: ${reason}`,
  );
}

function normalizeApiValue(value: unknown, ancestors: WeakSet<object>): GoogleAppsScriptApiValue {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return failSerialization("numbers must be finite.");
    }

    return value;
  }

  if (typeof value !== "object") {
    return failSerialization(`unsupported ${typeof value} value.`);
  }

  if (ancestors.has(value)) {
    return failSerialization("cyclic object graphs are not supported.");
  }

  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      const keys = Object.keys(value);

      if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
        return failSerialization(
          "arrays must be dense and contain no extra enumerable properties.",
        );
      }

      const normalized: GoogleAppsScriptApiValue[] = [];

      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));

        if (descriptor === undefined || !("value" in descriptor)) {
          return failSerialization("array accessors are not supported.");
        }

        normalized.push(normalizeApiValue(descriptor.value, ancestors));
      }

      return normalized;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return failSerialization("only plain objects are supported.");
    }

    const entries: [string, GoogleAppsScriptApiValue][] = [];

    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);

      if (descriptor === undefined || !descriptor.enumerable) {
        continue;
      }
      if (typeof key !== "string") {
        return failSerialization("symbol object keys are not supported.");
      }
      if (!("value" in descriptor)) {
        return failSerialization("object accessors are not supported.");
      }

      entries.push([key, normalizeApiValue(descriptor.value, ancestors)]);
    }

    return Object.fromEntries(entries);
  } finally {
    ancestors.delete(value);
  }
}

function normalizeParameters(args: readonly unknown[]): GoogleAppsScriptApiValue[] {
  return args.map((value) => normalizeApiValue(value, new WeakSet()));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function restoreExecutionError(status: Record<string, unknown>): Error {
  const detail = isUnknownArray(status.details)
    ? status.details.find(
        (candidate) => isRecord(candidate) && typeof candidate.errorMessage === "string",
      )
    : undefined;
  const name =
    isRecord(detail) && typeof detail.errorType === "string" && detail.errorType.length > 0
      ? detail.errorType
      : "Error";
  const message =
    isRecord(detail) && typeof detail.errorMessage === "string"
      ? detail.errorMessage
      : typeof status.message === "string"
        ? status.message
        : "Google Apps Script execution failed.";
  const stack = [`${name}: ${message}`];

  if (isRecord(detail) && isUnknownArray(detail.scriptStackTraceElements)) {
    // Google exposes function names and line numbers rather than a JavaScript Error.stack string.
    // Vegas formats those documented frames into stack-like lines without inventing source files.
    for (const frame of detail.scriptStackTraceElements) {
      if (!isRecord(frame)) {
        continue;
      }

      const functionName =
        typeof frame.function === "string" && frame.function.length > 0
          ? frame.function
          : "<anonymous>";
      const lineNumber =
        typeof frame.lineNumber === "number" && Number.isInteger(frame.lineNumber)
          ? frame.lineNumber
          : undefined;

      stack.push(
        lineNumber === undefined
          ? `    at ${functionName}`
          : `    at ${functionName} (line ${lineNumber})`,
      );
    }
  }

  return restoreRuntimeError({
    name,
    message,
    stack: stack.join("\n"),
  });
}

async function parseOperation(
  response: Response,
  callerSignal: AbortSignal | undefined,
  timeoutSignal: AbortSignal,
): Promise<Record<string, unknown>> {
  let operation: unknown;

  try {
    operation = await response.json();
  } catch (cause) {
    throwCallerAbort(callerSignal);

    if (timeoutSignal.aborted) {
      throw timeoutSignal.reason;
    }

    throw new RuntimeInfrastructureError(
      "protocol",
      "Google Apps Script API returned an invalid JSON response.",
      { cause },
    );
  }

  if (!isRecord(operation)) {
    throw new RuntimeInfrastructureError(
      "protocol",
      "Google Apps Script API returned an invalid operation.",
    );
  }

  return operation;
}

function throwCallerAbort(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw signal.reason ?? new Error("Google Apps Script execution aborted.");
  }
}

export function createGoogleAppsScriptRuntime(
  options: GoogleAppsScriptRuntimeOptions,
): RuntimeBackend {
  if (options.scriptId.length === 0) {
    throw new RangeError("Google Apps Script script id must not be empty.");
  }

  const requestTimeoutMs = requireRequestTimeout(
    options.requestTimeoutMs ?? DEFAULT_GOOGLE_APPS_SCRIPT_REQUEST_TIMEOUT_MS,
  );
  const fetchImplementation = options.fetch ?? globalThis.fetch;

  return {
    async execute(request: RuntimeExecutionRequest): Promise<unknown> {
      if (request.context?.webApp === true) {
        throw new RuntimeInfrastructureError(
          "backend",
          "Google Apps Script API execution does not support Vegas web-app invocation context.",
        );
      }

      throwCallerAbort(request.signal);

      const parameters = normalizeParameters(request.args);

      let accessToken: string;
      try {
        accessToken = await options.acquireAccessToken(
          GOOGLE_APPS_SCRIPT_ACCESS_TOKEN_MINIMUM_VALIDITY_MS,
          request.signal,
        );
      } catch (cause) {
        throwCallerAbort(request.signal);

        throw new RuntimeInfrastructureError(
          "authentication",
          "Google Apps Script access token acquisition failed.",
          { cause },
        );
      }

      throwCallerAbort(request.signal);

      if (accessToken.length === 0) {
        throw new RuntimeInfrastructureError(
          "authentication",
          "Google Apps Script access token acquisition returned an empty token.",
        );
      }

      const timeoutController = new AbortController();
      const timeoutError = new RuntimeInfrastructureError(
        "timeout",
        `Google Apps Script request timed out after ${requestTimeoutMs} ms.`,
      );
      const timeoutId = setTimeout(() => {
        timeoutController.abort(timeoutError);
      }, requestTimeoutMs);
      const signal =
        request.signal === undefined
          ? timeoutController.signal
          : AbortSignal.any([request.signal, timeoutController.signal]);
      const body = {
        function: request.functionName,
        ...(parameters.length === 0 ? {} : { parameters }),
        ...(options.devMode === true ? { devMode: true } : {}),
      };

      let response: Response;

      try {
        response = await fetchImplementation(
          `https://script.googleapis.com/v1/scripts/${encodeURIComponent(options.scriptId)}:run`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal,
          },
        );
      } catch (cause) {
        clearTimeout(timeoutId);
        throwCallerAbort(request.signal);

        if (timeoutController.signal.aborted) {
          throw timeoutError;
        }

        throw new RuntimeInfrastructureError(
          "backend",
          "Google Apps Script execution request failed.",
          { cause },
        );
      }

      try {
        throwCallerAbort(request.signal);

        if (!response.ok) {
          const kind =
            response.status === 401 || response.status === 403 ? "authentication" : "backend";

          throw new RuntimeInfrastructureError(
            kind,
            `Google Apps Script execution request failed with HTTP ${response.status}.`,
          );
        }

        const operation = await parseOperation(response, request.signal, timeoutController.signal);

        if (operation.done !== true) {
          throw new RuntimeInfrastructureError(
            "protocol",
            "Google Apps Script API returned an incomplete execution operation.",
          );
        }

        const hasError = Object.hasOwn(operation, "error");
        const hasResponse = Object.hasOwn(operation, "response");

        if (hasError === hasResponse) {
          throw new RuntimeInfrastructureError(
            "protocol",
            "Google Apps Script API returned an invalid execution operation result.",
          );
        }

        if (hasError) {
          const executionError = operation.error;

          if (!isRecord(executionError)) {
            throw new RuntimeInfrastructureError(
              "protocol",
              "Google Apps Script API returned an invalid execution error.",
            );
          }

          if (executionError.code === 10) {
            throw new RuntimeInfrastructureError(
              "timeout",
              typeof executionError.message === "string"
                ? executionError.message
                : "Google Apps Script execution timed out.",
            );
          }

          throw restoreExecutionError(executionError);
        }

        const executionResponse = operation.response;
        if (!isRecord(executionResponse)) {
          throw new RuntimeInfrastructureError(
            "protocol",
            "Google Apps Script API returned an invalid execution response.",
          );
        }

        return Object.hasOwn(executionResponse, "result") ? executionResponse.result : undefined;
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}
