import path from "node:path";
import worker from "node:worker_threads";

import { HttpResponse } from "./HTTPResponse";

// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
export class UrlFetchApp implements GoogleAppsScript.URL_Fetch.UrlFetchApp {
  #createRequest(url: string, params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) {
    const request: GoogleAppsScript.URL_Fetch.URLFetchRequest = {
      url,
      contentType: params?.contentType ?? "application/x-www-form-urlencoded",
      headers: params?.headers ?? {},
      method: params?.method ?? "get",
      payload: params?.payload ?? "",
    };
    if (params?.useIntranet) {
      request.useIntranet = params.useIntranet;
    }
    if (params?.validateHttpsCertificates) {
      request.validateHttpsCertificates = params.validateHttpsCertificates;
    }
    if (params?.followRedirects) {
      request.followRedirects = params.validateHttpsCertificates;
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
    const sharedBuffer = new SharedArrayBuffer(4);
    const sharedArray = new Int32Array(sharedBuffer);
    const { port1, port2 } = new worker.MessageChannel();
    new worker.Worker(path.join(import.meta.dirname, "fetch.js"), {
      transferList: [port2],
      workerData: { sharedArray, port: port2 },
    });

    const requestParam = this.#createRequest(url, params);

    const init: RequestInit = {
      method: requestParam.method,
      headers: {
        ...requestParam.headers,
        "Content-Type": requestParam.contentType!,
      },
      redirect: (requestParam.followRedirects ?? true) ? "follow" : "manual",
      body: requestParam.payload as any,
    };

    port1.postMessage({ url, init });
    Atomics.store(sharedArray, 0, 1);
    Atomics.wait(sharedArray, 0, 1);
    const result = worker.receiveMessageOnPort(port1);
    port1.close();

    return new HttpResponse(
      result?.message.headers,
      result?.message.content,
      result?.message.responseCode,
    );
  };
  fetchAll = (requests: Array<GoogleAppsScript.URL_Fetch.URLFetchRequest | string>) => {
    return requests.map((request) => {
      if (typeof request === "string") {
        return this.fetch(request);
      } else {
        return this.fetch(request.url, {
          contentType: request.contentType,
          headers: request.headers,
          method: request.method,
          payload: request.payload,
          useIntranet: request.useIntranet,
          validateHttpsCertificates: request.validateHttpsCertificates,
          followRedirects: request.followRedirects,
          muteHttpExceptions: request.muteHttpExceptions,
          escaping: request.escaping,
        });
      }
    });
  };
  getRequest = (url: string, params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) => {
    return this.#createRequest(url, params);
  };
}
