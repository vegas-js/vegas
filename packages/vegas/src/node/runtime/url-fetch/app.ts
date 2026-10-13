import { hydrateHttpResponse, type HTTPResponse } from "./http-response";
import {
  normalizeUrlFetchRequest,
  type UrlFetchFormFieldInput,
  type UrlFetchPayloadInput,
  type UrlFetchRequestInput,
  type UrlFetchRequestOptionsInput,
} from "./request";
import {
  createBlobConverter,
  RuntimeBlob,
  type BlobConverter,
  type HostBridge,
} from "./runtime-boundary";
import type { UrlFetchMethod } from "./value";

export interface UrlFetchRequestPreview {
  readonly url: string;
  readonly method: UrlFetchMethod;
  readonly contentType: string;
  readonly payload: UrlFetchPayloadInput | undefined;
  readonly headers: Readonly<Record<string, string>>;
}

// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
export class UrlFetchApp {
  readonly #blobConverter: BlobConverter;
  readonly #bridge: HostBridge;

  constructor(bridge: HostBridge) {
    this.#blobConverter = createBlobConverter(bridge);
    this.#bridge = bridge;
  }

  fetch(url: string): HTTPResponse;
  fetch(url: string, params: UrlFetchRequestOptionsInput): HTTPResponse;
  fetch(url: string, params?: UrlFetchRequestOptionsInput): HTTPResponse {
    return hydrateHttpResponse(
      this.#bridge.call({
        service: "url-fetch",
        operation: "fetch",
        request: normalizeUrlFetchRequest(url, params),
      }),
      this.#blobConverter,
    );
  }

  fetchAll(requests: readonly UrlFetchRequestInput[]): HTTPResponse[] {
    const responses = this.#bridge.call({
      service: "url-fetch",
      operation: "fetch-all",
      requests: requests.map((request) => normalizeUrlFetchRequest(request)),
    });

    return responses.map((response) => hydrateHttpResponse(response, this.#blobConverter));
  }

  getRequest(url: string): UrlFetchRequestPreview;
  getRequest(url: string, params: UrlFetchRequestOptionsInput): UrlFetchRequestPreview;
  getRequest(url: string, params: UrlFetchRequestOptionsInput = {}): UrlFetchRequestPreview {
    return {
      url,
      method: params.method ?? "get",
      contentType: resolvePreviewContentType(params),
      payload: params.payload === undefined ? undefined : clonePayload(params.payload),
      headers: params.headers === undefined ? {} : { ...params.headers },
    };
  }
}

function resolvePreviewContentType(params: UrlFetchRequestOptionsInput): string {
  // Vegas local preview follows the Node transport's Content-Type precedence.
  // Google does not document getRequest() precedence for headers and Blob MIME types.
  // Match the Node transport, which parses header names case-insensitively
  // and merges duplicate names before sending the request.
  const header =
    params.headers === undefined ? null : new Headers(params.headers).get("content-type");

  if (header !== null) {
    return header;
  }

  if (params.contentType !== undefined) {
    return params.contentType;
  }

  if (params.payload instanceof RuntimeBlob) {
    return params.payload.getContentType() ?? resolveDefaultContentType(params.payload);
  }

  return resolveDefaultContentType(params.payload);
}

function resolveDefaultContentType(payload: UrlFetchPayloadInput | undefined): string {
  if (payload !== undefined && isFormPayload(payload)) {
    const containsBlob = Object.values(payload).some((value) => value instanceof RuntimeBlob);
    if (containsBlob) {
      return "multipart/form-data";
    }
  }

  return "application/x-www-form-urlencoded";
}

function clonePayload(payload: UrlFetchPayloadInput): UrlFetchPayloadInput {
  if (typeof payload === "string") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return [...payload];
  }

  if (payload instanceof RuntimeBlob) {
    return payload.copyBlob();
  }

  return Object.fromEntries(
    Object.entries(payload).map(([name, value]) => [
      name,
      value instanceof RuntimeBlob ? value.copyBlob() : value,
    ]),
  );
}

function isFormPayload(
  payload: UrlFetchPayloadInput,
): payload is Readonly<Record<string, UrlFetchFormFieldInput>> {
  return (
    typeof payload === "object" && !Array.isArray(payload) && !(payload instanceof RuntimeBlob)
  );
}

export function createUrlFetchApp(bridge: HostBridge): UrlFetchApp {
  return new UrlFetchApp(bridge);
}
