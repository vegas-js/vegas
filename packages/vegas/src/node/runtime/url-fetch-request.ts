import { RuntimeBlob, serializeBlob } from "./blob";
import type { UrlFetchMethod, UrlFetchPayloadValue, UrlFetchRequestValue } from "./url-fetch-value";

export type UrlFetchFormFieldInput = string | RuntimeBlob;

export type UrlFetchPayloadInput =
  | string
  | readonly number[]
  | RuntimeBlob
  | Readonly<Record<string, UrlFetchFormFieldInput>>;

export interface UrlFetchRequestOptionsInput {
  readonly contentType?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly method?: UrlFetchMethod;
  readonly payload?: UrlFetchPayloadInput;
  readonly useIntranet?: boolean;
  readonly validateHttpsCertificates?: boolean;
  readonly followRedirects?: boolean;
  readonly muteHttpExceptions?: boolean;
  readonly escaping?: boolean;
  readonly timeoutSeconds?: number;
}

export type UrlFetchRequestInput =
  | string
  | (UrlFetchRequestOptionsInput & {
      readonly url: string;
    });

// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
export function normalizeUrlFetchRequest(
  request: UrlFetchRequestInput,
  options?: UrlFetchRequestOptionsInput,
): UrlFetchRequestValue {
  if (typeof request === "string") {
    return createRequestValue(request, options);
  }

  if (options !== undefined) {
    throw new TypeError("UrlFetch request options cannot be provided twice.");
  }

  const { url, ...requestOptions } = request;
  return createRequestValue(url, requestOptions);
}

function createRequestValue(
  url: string,
  options: UrlFetchRequestOptionsInput = {},
): UrlFetchRequestValue {
  return {
    url,
    ...(options.contentType === undefined ? {} : { contentType: options.contentType }),
    ...(options.headers === undefined ? {} : { headers: { ...options.headers } }),
    ...(options.method === undefined ? {} : { method: options.method }),
    ...(options.payload === undefined ? {} : { payload: normalizePayload(options.payload) }),
    ...(options.useIntranet === undefined ? {} : { useIntranet: options.useIntranet }),
    ...(options.validateHttpsCertificates === undefined
      ? {}
      : { validateHttpsCertificates: options.validateHttpsCertificates }),
    ...(options.followRedirects === undefined ? {} : { followRedirects: options.followRedirects }),
    ...(options.muteHttpExceptions === undefined
      ? {}
      : { muteHttpExceptions: options.muteHttpExceptions }),
    ...(options.escaping === undefined ? {} : { escaping: options.escaping }),
    ...(options.timeoutSeconds === undefined ? {} : { timeoutSeconds: options.timeoutSeconds }),
  };
}

function normalizePayload(payload: UrlFetchPayloadInput): UrlFetchPayloadValue {
  if (typeof payload === "string") {
    return { kind: "text", value: payload };
  }

  if (Array.isArray(payload)) {
    return { kind: "bytes", value: [...payload] };
  }

  if (payload instanceof RuntimeBlob) {
    return { kind: "blob", value: serializeBlob(payload) };
  }

  return {
    kind: "form",
    fields: Object.fromEntries(
      Object.entries(payload).map(([name, value]) => [
        name,
        value instanceof RuntimeBlob ? serializeBlob(value) : value,
      ]),
    ),
  };
}
