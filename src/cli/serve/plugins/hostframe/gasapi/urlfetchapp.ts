import { join } from "node:path";
import { MessageChannel, receiveMessageOnPort, Worker } from "node:worker_threads";

import { GASHttpResponse } from "./httpresponse";

// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
export class GASUrlFetchApp implements GoogleAppsScript.URL_Fetch.UrlFetchApp {
  fetch(
    url: string,
    params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions,
  ): GoogleAppsScript.URL_Fetch.HTTPResponse {
    const worker = new Worker(join(import.meta.dirname, "worker.js"));
    const sharedBuffer = new SharedArrayBuffer(4);
    const int32Array = new Int32Array(sharedBuffer);
    const { port1, port2 } = new MessageChannel();

    worker.postMessage({ url, params, sharedBuffer, port: port2 }, [port2]);
    Atomics.wait(int32Array, 0, 0);
    const result = receiveMessageOnPort(port1);
    void worker.terminate();
    return new GASHttpResponse(result?.message);
  }
  fetchAll(
    requests: Array<GoogleAppsScript.URL_Fetch.URLFetchRequest | string>,
  ): GoogleAppsScript.URL_Fetch.HTTPResponse[] {
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
  }
  getRequest(
    _url: string,
    _params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions,
  ): GoogleAppsScript.URL_Fetch.URLFetchRequest {
    throw new Error("Method not implemented.");
  }
}
