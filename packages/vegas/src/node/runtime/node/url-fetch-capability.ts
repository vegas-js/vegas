import { UnsupportedRuntimeOperationError } from "../unsupported-runtime-operation-error";
import type { UrlFetchCapability } from "../url-fetch/capability";
import type {
  UrlFetchFormFieldValue,
  UrlFetchPayloadValue,
  UrlFetchRequestValue,
  UrlFetchResponseHeaderValue,
  UrlFetchResponseValue,
} from "../url-fetch/value";

type FetchFunction = (url: string, init: RequestInit) => Promise<Response>;

const DEFAULT_TIMEOUT_SECONDS = 360;
const MAX_NODE_TIMER_DELAY_MS = 2_147_483_647;
// Vegas local limit: keep seconds-to-milliseconds conversion exact.
const MAX_SAFE_TIMEOUT_SECONDS = Math.floor(Number.MAX_SAFE_INTEGER / 1_000);

function toSignedByte(value: number): number {
  return value > 0x7f ? value - 0x100 : value;
}

function validateRequest(request: UrlFetchRequestValue): void {
  if (request.validateHttpsCertificates === false) {
    throw new UnsupportedRuntimeOperationError(
      "UrlFetchApp.fetch()/fetchAll()",
      "validateHttpsCertificates=false cannot be represented by the Node Local Runtime.",
    );
  }

  if (request.escaping === false) {
    throw new UnsupportedRuntimeOperationError(
      "UrlFetchApp.fetch()/fetchAll()",
      "escaping=false cannot be represented by the Node Local Runtime.",
    );
  }

  if (request.useIntranet === true) {
    throw new UnsupportedRuntimeOperationError(
      "UrlFetchApp.fetch()/fetchAll()",
      "useIntranet=true is not available in the Node Local Runtime.",
    );
  }

  if (
    request.timeoutSeconds !== undefined &&
    (!Number.isInteger(request.timeoutSeconds) || request.timeoutSeconds <= 0)
  ) {
    throw new RangeError("UrlFetch timeoutSeconds must be a positive integer.");
  }

  if (request.timeoutSeconds !== undefined && request.timeoutSeconds > MAX_SAFE_TIMEOUT_SECONDS) {
    throw new RangeError("UrlFetch timeoutSeconds exceeds the local safe duration limit.");
  }

  if ((request.method ?? "get") === "get" && request.payload !== undefined) {
    throw new TypeError("UrlFetch GET requests cannot include a payload.");
  }
}

function containsBlob(fields: Readonly<Record<string, UrlFetchFormFieldValue>>): boolean {
  return Object.values(fields).some((value) => typeof value !== "string");
}

function createFormData(fields: Readonly<Record<string, UrlFetchFormFieldValue>>): FormData {
  const form = new FormData();

  for (const [name, value] of Object.entries(fields)) {
    if (typeof value === "string") {
      form.append(name, value);
      continue;
    }

    const blob = new Blob(
      [Uint8Array.from(value.bytes, (byte) => byte & 0xff)],
      value.contentType === null ? undefined : { type: value.contentType },
    );

    if (value.name === null) {
      form.append(name, blob);
    } else {
      form.append(name, blob, value.name);
    }
  }

  return form;
}

function createBody(payload: UrlFetchPayloadValue | undefined): BodyInit | undefined {
  if (payload === undefined) {
    return undefined;
  }

  switch (payload.kind) {
    case "text":
      return payload.value;
    case "bytes":
      return Uint8Array.from(payload.value, (value) => value & 0xff);
    case "blob":
      return Uint8Array.from(payload.value.bytes, (value) => value & 0xff);
    case "form": {
      if (containsBlob(payload.fields)) {
        return createFormData(payload.fields);
      }

      const params = new URLSearchParams();
      for (const [name, value] of Object.entries(payload.fields)) {
        params.append(name, value as string);
      }
      return params;
    }
  }
}

/** Keep timeout timers within Node.js bounds and dispose of them when fetch completes. */
function createRequestTimeout(timeoutMs: number): { signal: AbortSignal; dispose(): void } {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = (remainingMs: number): void => {
    const delay = Math.min(remainingMs, MAX_NODE_TIMER_DELAY_MS);
    timer = setTimeout(() => {
      if (remainingMs > delay) {
        schedule(remainingMs - delay);
        return;
      }

      controller.abort(
        new DOMException("The operation was aborted due to timeout", "TimeoutError"),
      );
    }, delay);
  };

  schedule(timeoutMs);
  return {
    signal: controller.signal,
    dispose: () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    },
  };
}

function createRequestInit(request: UrlFetchRequestValue): RequestInit {
  validateRequest(request);

  const headers = new Headers(request.headers);
  if (request.contentType !== undefined && !headers.has("content-type")) {
    headers.set("content-type", request.contentType);
  }

  if (
    request.payload?.kind === "blob" &&
    request.payload.value.contentType !== null &&
    !headers.has("content-type")
  ) {
    headers.set("content-type", request.payload.value.contentType);
  }

  if (
    request.payload?.kind === "form" &&
    !containsBlob(request.payload.fields) &&
    !headers.has("content-type")
  ) {
    headers.set("content-type", "application/x-www-form-urlencoded");
  }

  return {
    method: request.method ?? "get",
    headers,
    body: createBody(request.payload),
    redirect: request.followRedirects === false ? "manual" : "follow",
  };
}

function readHeaders(headers: Headers): Record<string, UrlFetchResponseHeaderValue> {
  const entries: [string, string][] = [];

  headers.forEach((value, name) => {
    entries.push([name, value]);
  });

  // Vegas local emulation: HTTPResponse.getAllHeaders() does not define how
  // special JavaScript property names such as "__proto__" are represented.
  // Preserve these names as own data properties; Google parity is unverified.
  const values: Record<string, UrlFetchResponseHeaderValue> = Object.fromEntries(entries);

  const cookies = headers.getSetCookie();
  if (cookies.length > 1) {
    values["set-cookie"] = cookies;
  } else if (cookies.length === 1) {
    values["set-cookie"] = cookies[0] as string;
  }

  return values;
}

async function serializeResponse(response: Response): Promise<UrlFetchResponseValue> {
  const content = new Uint8Array(await response.arrayBuffer());

  return {
    statusCode: response.status,
    headers: readHeaders(response.headers),
    content: Array.from(content, toSignedByte),
  };
}

export class NodeUrlFetchCapability implements UrlFetchCapability {
  readonly #fetch: FetchFunction;

  constructor(fetchFunction: FetchFunction = globalThis.fetch) {
    this.#fetch = fetchFunction;
  }

  async fetch(request: UrlFetchRequestValue, signal?: AbortSignal): Promise<UrlFetchResponseValue> {
    // A cancelled invocation must not start an HTTP operation, even when a
    // custom FetchFunction does not implement AbortSignal handling itself.
    signal?.throwIfAborted();

    // Validate/build first so a failed request cannot leave a timeout running.
    const init = createRequestInit(request);
    return this.#fetchPrepared(request, init, signal);
  }

  async fetchAll(
    requests: readonly UrlFetchRequestValue[],
    signal?: AbortSignal,
  ): Promise<readonly UrlFetchResponseValue[]> {
    signal?.throwIfAborted();

    // Vegas local emulation: reject invalid batches before any HTTP request starts.
    // Google does not document dispatch atomicity for invalid fetchAll() entries.
    const prepared = requests.map((request) => ({ request, init: createRequestInit(request) }));
    const pending = prepared.map(({ request, init }) => this.#fetchPrepared(request, init, signal));

    try {
      return await Promise.all(pending);
    } catch (error) {
      // Keep the first failure but allow every started request to settle before
      // ending the invocation. Otherwise a sibling request can keep running
      // after the worker has returned its failed fetchAll() result.
      await Promise.allSettled(pending);
      throw error;
    }
  }

  async #fetchPrepared(
    request: UrlFetchRequestValue,
    init: RequestInit,
    signal?: AbortSignal,
  ): Promise<UrlFetchResponseValue> {
    // Check again immediately before dispatch, even with custom fetch implementations.
    signal?.throwIfAborted();

    const timeout = createRequestTimeout(
      (request.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS) * 1_000,
    );
    try {
      const response = await this.#fetch(request.url, {
        ...init,
        signal: signal === undefined ? timeout.signal : AbortSignal.any([signal, timeout.signal]),
      });

      if (response.status >= 400 && request.muteHttpExceptions !== true) {
        // The error response is not consumed. Cancel its body to release the
        // underlying connection without replacing the original HTTP error.
        void response.body?.cancel().catch(() => undefined);
        throw new Error(`UrlFetch request failed with HTTP status ${response.status}.`);
      }

      return await serializeResponse(response);
    } finally {
      timeout.dispose();
    }
  }
}
