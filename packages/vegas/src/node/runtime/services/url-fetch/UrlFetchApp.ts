import type { RuntimeFetchRequest, RuntimeServicePort } from "../../protocol";
import { HttpResponse } from "./HTTPResponse";

// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
export class UrlFetchApp implements GoogleAppsScript.URL_Fetch.UrlFetchApp {
  readonly #service: RuntimeServicePort<"UrlFetch">;

  constructor(service: RuntimeServicePort<"UrlFetch">) {
    this.#service = service;
  }

  #createRequest(url: string, params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) {
    const request: GoogleAppsScript.URL_Fetch.URLFetchRequest = {
      url,
      contentType: params?.contentType ?? "application/x-www-form-urlencoded",
      headers: params?.headers ?? {},
      method: params?.method ?? "get",
      payload: params?.payload,
    };
    if (params?.useIntranet) {
      request.useIntranet = params.useIntranet;
    }
    if (params?.validateHttpsCertificates) {
      request.validateHttpsCertificates = params.validateHttpsCertificates;
    }
    if (params?.followRedirects) {
      request.followRedirects = params.followRedirects;
    }
    if (params?.muteHttpExceptions) {
      request.muteHttpExceptions = params.muteHttpExceptions;
    }
    if (params?.escaping) {
      request.escaping = params.escaping;
    }

    return request;
  }

  fetch = (url: string, params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) => {
    const requestParam = this.#createRequest(url, params);

    const result = this.#service.fetch({
      url,
      method: requestParam.method,
      headers: {
        ...requestParam.headers,
        "Content-Type": requestParam.contentType!,
      },
      redirect: (requestParam.followRedirects ?? true) ? "follow" : "manual",
      body: requestParam.payload,
    });

    return new HttpResponse(result.headers, result.content, result.responseCode);
  };
  fetchAll = (requests: Array<GoogleAppsScript.URL_Fetch.URLFetchRequest | string>) => {
    const fetchRequests: RuntimeFetchRequest[] = requests.map((request) => {
      if (typeof request === "string") {
        return { url: request };
      } else {
        const requestParam = this.#createRequest(request.url, request);
        return {
          url: request.url,
          method: requestParam.method,
          headers: {
            ...requestParam.headers,
            "Content-Type": requestParam.contentType!,
          },
          redirect: (requestParam.followRedirects ?? true) ? "follow" : "manual",
          body: requestParam.payload,
        };
      }
    });
    const results = this.#service.fetchAll(fetchRequests);

    return results.map((result: any) => {
      return new HttpResponse(result?.headers, result?.content, result?.responseCode);
    });
  };
  getRequest = (url: string, params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) => {
    return this.#createRequest(url, params);
  };
}
