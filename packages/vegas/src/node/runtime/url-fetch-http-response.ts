import { createBlob, type RuntimeBlob } from "./blob";
import { convertBlob, type BlobConverter } from "./blob-converter";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";
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

function flattenHeaders(
  headers: Readonly<Record<string, UrlFetchResponseHeaderValue>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).flatMap(([name, value]) => {
      if (typeof value === "string") {
        return [[name, value]];
      }

      const firstValue = value[0];
      return firstValue === undefined ? [] : [[name, firstValue]];
    }),
  );
}

const DEFAULT_CONTENT_CHARSET = "UTF-8";

function decodeContent(content: readonly number[], charset: string): string {
  return new TextDecoder(charset).decode(Uint8Array.from(content, (value) => value & 0xff));
}

// https://developers.google.com/apps-script/reference/url-fetch/http-response
export class HTTPResponse {
  readonly #blobConverter: BlobConverter | undefined;
  readonly #value: UrlFetchResponseValue;

  constructor(value: UrlFetchResponseValue, blobConverter?: BlobConverter) {
    this.#blobConverter = blobConverter;
    this.#value = cloneResponseValue(value);
  }

  getAllHeaders(): Record<string, UrlFetchResponseHeaderValue> {
    return cloneHeaders(this.#value.headers);
  }

  getAs(contentType: string): RuntimeBlob {
    if (this.#blobConverter === undefined) {
      throw new UnsupportedRuntimeOperationError(
        "HTTPResponse.getAs()",
        "Blob conversion is not available in this Runtime context.",
      );
    }

    return convertBlob(this.getBlob(), contentType, this.#blobConverter);
  }

  getBlob(): RuntimeBlob {
    return createBlob(this.#value.content);
  }

  getContent(): number[] {
    return [...this.#value.content];
  }

  getContentText(): string;
  getContentText(charset: string): string;
  getContentText(charset = DEFAULT_CONTENT_CHARSET): string {
    // Apps Script documents both overloads but does not define the default charset for the
    // zero-argument form. Vegas uses UTF-8 as its explicit local Runtime contract; undocumented
    // Google behavior remains intentionally unspecified.
    return decodeContent(this.#value.content, charset);
  }

  getHeaders(): Record<string, string> {
    // Apps Script documents that getAllHeaders() preserves multiple values as arrays, but does not
    // define how getHeaders() reduces those values to a single map entry. Vegas returns the first
    // value and omits empty arrays; undocumented Google behavior remains intentionally unspecified.
    return flattenHeaders(this.#value.headers);
  }

  getResponseCode(): number {
    return this.#value.statusCode;
  }
}

export function hydrateHttpResponse(
  value: UrlFetchResponseValue,
  blobConverter?: BlobConverter,
): HTTPResponse {
  return new HTTPResponse(value, blobConverter);
}
