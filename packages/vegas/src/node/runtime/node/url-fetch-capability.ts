import type { UrlFetchCapability } from "../url-fetch-capability";
import type {
  UrlFetchFormFieldValue,
  UrlFetchPayloadValue,
  UrlFetchRequestValue,
  UrlFetchResponseHeaderValue,
  UrlFetchResponseValue,
} from "../url-fetch-value";

type FetchFunction = (url: string, init: RequestInit) => Promise<Response>;

const DEFAULT_TIMEOUT_SECONDS = 360;

function toSignedByte(value: number): number {
  return value > 0x7f ? value - 0x100 : value;
}

function validateRequest(request: UrlFetchRequestValue): void {
  if (request.validateHttpsCertificates === false) {
    throw new Error("Node UrlFetch cannot faithfully represent validateHttpsCertificates=false.");
  }

  if (request.escaping === false) {
    throw new Error("Node UrlFetch cannot faithfully represent escaping=false.");
  }

  if (request.useIntranet === true) {
    throw new Error("Node UrlFetch cannot faithfully represent useIntranet=true.");
  }

  if (
    request.timeoutSeconds !== undefined &&
    (!Number.isInteger(request.timeoutSeconds) || request.timeoutSeconds <= 0)
  ) {
    throw new RangeError("UrlFetch timeoutSeconds must be a positive integer.");
  }

  if ((request.method ?? "get") === "get" && request.payload !== undefined) {
    throw new Error("UrlFetch GET requests cannot include a payload.");
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

function createRequestInit(request: UrlFetchRequestValue, signal?: AbortSignal): RequestInit {
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

  const timeoutSignal = AbortSignal.timeout(
    (request.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS) * 1_000,
  );

  return {
    method: request.method ?? "get",
    headers,
    body: createBody(request.payload),
    redirect: request.followRedirects === false ? "manual" : "follow",
    signal: signal === undefined ? timeoutSignal : AbortSignal.any([signal, timeoutSignal]),
  };
}

function readHeaders(headers: Headers): Record<string, UrlFetchResponseHeaderValue> {
  const values: Record<string, UrlFetchResponseHeaderValue> = {};

  headers.forEach((value, name) => {
    values[name] = value;
  });

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
    const response = await this.#fetch(request.url, createRequestInit(request, signal));

    if (response.status >= 400 && request.muteHttpExceptions !== true) {
      throw new Error(`UrlFetch request failed with HTTP status ${response.status}.`);
    }

    return serializeResponse(response);
  }

  async fetchAll(
    requests: readonly UrlFetchRequestValue[],
    signal?: AbortSignal,
  ): Promise<readonly UrlFetchResponseValue[]> {
    return Promise.all(requests.map((request) => this.fetch(request, signal)));
  }
}
