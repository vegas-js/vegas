import type { RuntimeFetchRequest, RuntimeServicePort } from "../../protocol";
import { HttpResponse } from "./HTTPResponse";

type NormalizedUrlFetchRequest = {
  url: string;
  method: string;
  contentType: string | null;
  headers: GoogleAppsScript.URL_Fetch.HttpHeaders;
  payload: unknown;
  followRedirects: boolean;
  useIntranet: boolean;
  validateHttpsCertificates: boolean;
};

function createGasException(message: string): Error {
  const error = new Error(message);
  error.name = "Exception";
  return error;
}

function getRequestFailureUrl(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function isFormPayload(value: unknown): value is Record<string, unknown> {
  if (value === null || Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  /*
   * Blob facades are ordinary GAS-visible objects too. Do not interpret
   * them as form field maps.
   */
  return typeof (value as { getBytes?: unknown }).getBytes !== "function";
}

function encodeFormPayload(payload: Record<string, unknown>): string {
  const form = new URLSearchParams();

  for (const [name, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        form.append(name, String(item));
      }

      continue;
    }

    form.append(name, String(value));
  }

  return form.toString();
}

function createRuntimeHeaders(
  headers: GoogleAppsScript.URL_Fetch.HttpHeaders,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [name, value] of Object.entries(headers)) {
    result[name] = Array.isArray(value) ? value.join(",") : String(value);
  }

  return result;
}

// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
export class UrlFetchApp implements GoogleAppsScript.URL_Fetch.UrlFetchApp {
  readonly #service: RuntimeServicePort<"UrlFetch">;

  constructor(service: RuntimeServicePort<"UrlFetch">) {
    this.#service = service;
  }

  #createRequest(
    url: string,
    params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions,
  ): NormalizedUrlFetchRequest {
    const originalPayload = params?.payload;

    const formPayload = isFormPayload(originalPayload);

    const payload =
      originalPayload === undefined
        ? ""
        : formPayload
          ? encodeFormPayload(originalPayload)
          : originalPayload;

    const contentType =
      params?.contentType ?? (formPayload ? "application/x-www-form-urlencoded" : null);

    return {
      url,
      method: params?.method ?? "get",
      contentType,
      headers: {
        ...params?.headers,
      },
      payload,
      followRedirects: params?.followRedirects ?? true,
      useIntranet: params?.useIntranet ?? false,
      validateHttpsCertificates: params?.validateHttpsCertificates ?? true,
    };
  }

  #createRuntimeRequest(
    url: string,
    params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions,
  ): RuntimeFetchRequest {
    const normalized = this.#createRequest(url, params);

    const headers = createRuntimeHeaders(normalized.headers);

    if (normalized.contentType !== null) {
      headers["Content-Type"] = normalized.contentType;
    }

    const request: RuntimeFetchRequest = {
      url,
      method: normalized.method,
      headers,
      redirect: normalized.followRedirects ? "follow" : "manual",
    };

    /*
     * GAS getRequest() exposes an empty-string payload for an
     * otherwise empty GET, but the transport request must not send
     * a GET body.
     */
    if (normalized.payload !== "") {
      request.body = normalized.payload;
    }

    return request;
  }

  #assertSuccessfulResponse(url: string, responseCode: number, muteHttpExceptions: boolean): void {
    if (responseCode >= 400 && !muteHttpExceptions) {
      throw createGasException(
        `Request failed for ${getRequestFailureUrl(url)} returned code ${responseCode}`,
      );
    }
  }

  fetch = (url: string, params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) => {
    const result = this.#service.fetch(this.#createRuntimeRequest(url, params));

    this.#assertSuccessfulResponse(url, result.responseCode, params?.muteHttpExceptions === true);

    return new HttpResponse(result.headers, result.content, result.responseCode, url);
  };
  fetchAll = (requests: Array<GoogleAppsScript.URL_Fetch.URLFetchRequest | string>) => {
    const prepared = requests.map((request) => {
      if (typeof request === "string") {
        return {
          url: request,
          params: undefined,
          runtimeRequest: this.#createRuntimeRequest(request),
        };
      }

      return {
        url: request.url,
        params: request,
        runtimeRequest: this.#createRuntimeRequest(request.url, request),
      };
    });

    const results = this.#service.fetchAll(prepared.map(({ runtimeRequest }) => runtimeRequest));

    for (let index = 0; index < results.length; index++) {
      const result = results[index];
      const request = prepared[index];

      this.#assertSuccessfulResponse(
        request.url,
        result.responseCode,
        request.params?.muteHttpExceptions === true,
      );
    }

    return results.map(
      (result, index) =>
        new HttpResponse(result.headers, result.content, result.responseCode, prepared[index].url),
    );
  };
  getRequest = (url: string, params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) => {
    return this.#createRequest(
      url,
      params,
    ) as unknown as GoogleAppsScript.URL_Fetch.URLFetchRequest;
  };
}
