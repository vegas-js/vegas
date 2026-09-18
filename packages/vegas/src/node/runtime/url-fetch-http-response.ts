import { createBlob, type RuntimeBlob } from "./blob";
import type { UrlFetchResponseHeaderValue, UrlFetchResponseValue } from "./url-fetch-value";

function cloneHeaderValue(value: UrlFetchResponseHeaderValue): UrlFetchResponseHeaderValue {
  return Array.isArray(value) ? [...value] : value;
}

function cloneHeaders(
  headers: Readonly<Record<string, UrlFetchResponseHeaderValue>>,
): Record<string, UrlFetchResponseHeaderValue> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name, cloneHeaderValue(value)]),
  );
}

function cloneResponseValue(value: UrlFetchResponseValue): UrlFetchResponseValue {
  return {
    statusCode: value.statusCode,
    headers: cloneHeaders(value.headers),
    content: [...value.content],
  };
}

function decodeContent(content: readonly number[], charset: string): string {
  return new TextDecoder(charset).decode(Uint8Array.from(content, (value) => value & 0xff));
}

// https://developers.google.com/apps-script/reference/url-fetch/http-response
export class HTTPResponse {
  readonly #value: UrlFetchResponseValue;

  constructor(value: UrlFetchResponseValue) {
    this.#value = cloneResponseValue(value);
  }

  getAllHeaders(): Record<string, UrlFetchResponseHeaderValue> {
    return cloneHeaders(this.#value.headers);
  }

  getBlob(): RuntimeBlob {
    return createBlob(this.#value.content);
  }

  getContent(): number[] {
    return [...this.#value.content];
  }

  getContentText(charset: string): string {
    return decodeContent(this.#value.content, charset);
  }

  getResponseCode(): number {
    return this.#value.statusCode;
  }
}

export function hydrateHttpResponse(value: UrlFetchResponseValue): HTTPResponse {
  return new HTTPResponse(value);
}
