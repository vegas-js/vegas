import { RuntimeBlob } from "./blob";
import type { HostBridge } from "./host-bridge";
import { hydrateHttpResponse, type HTTPResponse } from "./url-fetch-http-response";
import {
  normalizeUrlFetchRequest,
  type UrlFetchFormFieldInput,
  type UrlFetchPayloadInput,
  type UrlFetchRequestInput,
  type UrlFetchRequestOptionsInput,
} from "./url-fetch-request";
import type { UrlFetchMethod } from "./url-fetch-value";

export interface UrlFetchRequestPreview {
  readonly url: string;
  readonly method: UrlFetchMethod;
  readonly contentType: string;
  readonly payload: UrlFetchPayloadInput | undefined;
  readonly headers: Readonly<Record<string, string>>;
}

// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
export class UrlFetchApp {
  readonly #bridge: HostBridge;

  constructor(bridge: HostBridge) {
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
    );
  }

  fetchAll(requests: readonly UrlFetchRequestInput[]): HTTPResponse[] {
    const responses = this.#bridge.call({
      service: "url-fetch",
      operation: "fetch-all",
      requests: requests.map((request) => normalizeUrlFetchRequest(request)),
    });

    return responses.map(hydrateHttpResponse);
  }

  getRequest(url: string): UrlFetchRequestPreview;
  getRequest(url: string, params: UrlFetchRequestOptionsInput): UrlFetchRequestPreview;
  getRequest(url: string, params: UrlFetchRequestOptionsInput = {}): UrlFetchRequestPreview {
    return {
      url,
      method: params.method ?? "get",
      contentType: params.contentType ?? resolveDefaultContentType(params.payload),
      payload: params.payload === undefined ? undefined : clonePayload(params.payload),
      headers: params.headers === undefined ? {} : { ...params.headers },
    };
  }
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
