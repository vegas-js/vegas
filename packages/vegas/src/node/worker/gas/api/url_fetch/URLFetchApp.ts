import path from "node:path";
import worker from "node:worker_threads";

import { HttpResponse } from "./HTTPResponse";

// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
export class UrlFetchApp implements GoogleAppsScript.URL_Fetch.UrlFetchApp {
  fetch = (url: string, params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) => {
    const sharedBuffer = new SharedArrayBuffer(4);
    const sharedArray = new Int32Array(sharedBuffer);
    const { port1, port2 } = new worker.MessageChannel();
    new worker.Worker(path.join(import.meta.dirname, "fetch.js"), {
      transferList: [port2],
      workerData: { sharedArray, port: port2 },
    });

    const init = {
      method: params?.method,
      headers: {
        ...params?.headers,
        "Content-Type": params?.contentType,
      },
      body: params?.payload as any,
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
    throw new Error("Method not implemented.");
  };
}
