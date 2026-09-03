import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RuntimeServicePort } from "../../protocol";
import { UrlFetchApp } from "./UrlFetchApp";

function unsupportedOAuthServiceMethod(): never {
  throw new Error("Function not implemented.");
}

export function createUrlFetchApp(
  service: RuntimeServicePort<"UrlFetch">,
  createObject?: CreateGasObject,
) {
  const implementation = new UrlFetchApp(service);

  return createGasServiceObject(
    {
      entries: [
        {
          kind: "method",
          name: "toString",
          value: () => "UrlFetchApp",
        },
        {
          kind: "method",
          name: "addOAuthService",
          value: unsupportedOAuthServiceMethod,
        },
        {
          kind: "method",
          name: "fetch",
          value: (url: string, params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) =>
            implementation.fetch(url, params),
        },
        {
          kind: "method",
          name: "fetchAll",
          value: (requests: Array<GoogleAppsScript.URL_Fetch.URLFetchRequest | string>) =>
            implementation.fetchAll(requests),
        },
        {
          kind: "method",
          name: "getRequest",
          value: (url: string, params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) =>
            implementation.getRequest(url, params),
        },
        {
          kind: "method",
          name: "removeOAuthService",
          value: unsupportedOAuthServiceMethod,
        },
      ],
    },
    createObject,
  );
}
