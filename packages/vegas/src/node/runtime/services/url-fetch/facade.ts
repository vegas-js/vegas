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
          name: "toString",
          value: () => "UrlFetchApp",
          writable: true,
        },
        {
          name: "addOAuthService",
          value: unsupportedOAuthServiceMethod,
          writable: true,
        },
        {
          name: "fetch",
          value: (url: string, params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) =>
            implementation.fetch(url, params),
          writable: true,
        },
        {
          name: "fetchAll",
          value: (requests: Array<GoogleAppsScript.URL_Fetch.URLFetchRequest | string>) =>
            implementation.fetchAll(requests),
          writable: true,
        },
        {
          name: "getRequest",
          value: (url: string, params?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) =>
            implementation.getRequest(url, params),
          writable: true,
        },
        {
          name: "removeOAuthService",
          value: unsupportedOAuthServiceMethod,
          writable: true,
        },
      ],
    },
    createObject,
  );
}
