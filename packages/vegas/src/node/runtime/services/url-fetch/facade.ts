import type { CreateGasArray, CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RuntimeServicePort } from "../../protocol";
import { createBlobFacadeFactory, type BlobFacadeFactory } from "../base/blobFacade";
import { createHttpResponseFacade } from "./httpResponseFacade";
import { UrlFetchApp } from "./UrlFetchApp";

export interface CreateUrlFetchAppOptions {
  createObject?: CreateGasObject;
  createArray?: CreateGasArray;
  blobFacadeFactory?: BlobFacadeFactory;
}

function unsupportedOAuthServiceMethod(): never {
  throw new Error("Function not implemented.");
}

export function createUrlFetchApp(
  service: RuntimeServicePort<"UrlFetch">,
  options: CreateUrlFetchAppOptions = {},
) {
  const {
    createObject,
    createArray,
    blobFacadeFactory = createBlobFacadeFactory(createObject),
  } = options;

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
            createHttpResponseFacade(implementation.fetch(url, params), {
              createObject,
              createArray,
              blobFacadeFactory,
            }),
          writable: true,
        },
        {
          name: "fetchAll",
          value: (requests: Array<GoogleAppsScript.URL_Fetch.URLFetchRequest | string>) => {
            const responses = createArray?.<GoogleAppsScript.URL_Fetch.HTTPResponse>() ?? [];

            for (const response of implementation.fetchAll(requests)) {
              responses.push(
                createHttpResponseFacade(response, {
                  createObject,
                  createArray,
                  blobFacadeFactory,
                }),
              );
            }

            return responses;
          },
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
