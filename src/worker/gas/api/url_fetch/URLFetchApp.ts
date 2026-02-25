import { join } from "node:path";
import { MessageChannel, receiveMessageOnPort, Worker } from "node:worker_threads";

import { HttpResponse } from "./HTTPResponse";

// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
export function UrlFetchApp(): GoogleAppsScript.URL_Fetch.UrlFetchApp {
  return {
    fetch: function (url: string, params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) {
      const worker = new Worker(join(import.meta.dirname, "gas.js"));
      const sharedBuffer = new SharedArrayBuffer(4);
      const int32Array = new Int32Array(sharedBuffer);
      const { port1, port2 } = new MessageChannel();

      const init = {
        method: params?.method,
        headers: {
          ...params?.headers,
          "Content-Type": params?.contentType,
        },
        body: params?.payload as any,
      };

      worker.postMessage({ url, init, sharedBuffer, port: port2 }, [port2]);
      Atomics.wait(int32Array, 0, 0);
      const result = receiveMessageOnPort(port1);
      void worker.terminate();
      return HttpResponse(
        result?.message.headers,
        result?.message.content,
        result?.message.responseCode,
      );
    },
    fetchAll: function (requests: Array<GoogleAppsScript.URL_Fetch.URLFetchRequest | string>) {
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
    },
    getRequest: function (
      _url: string,
      _params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions,
    ) {
      throw new Error("Method not implemented.");
    },
  };
}
