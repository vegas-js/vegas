import type { CreateGasArray, CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import { createBlobFacadeFactory, type BlobFacadeFactory } from "../base/blobFacade";

export interface CreateHttpResponseFacadeOptions {
  createObject?: CreateGasObject;
  createArray?: CreateGasArray;
  blobFacadeFactory?: BlobFacadeFactory;
}

const defaultCreateGasArray: CreateGasArray = <T>() => [] as T[];

function copyArray<T>(source: readonly T[], createArray: CreateGasArray): T[] {
  const result = createArray<T>();

  for (const value of source) {
    result.push(value);
  }

  return result;
}

function copyHeaders(
  source: object,
  createObject: CreateGasObject | undefined,
  createArray: CreateGasArray,
): Record<string, unknown> {
  const result = createObject?.() ?? {};

  for (const [name, headerValue] of Object.entries(source as Record<string, unknown>)) {
    if (Array.isArray(headerValue)) {
      result[name] = copyArray(headerValue, createArray);
    } else {
      result[name] = headerValue;
    }
  }

  return result;
}

export function createHttpResponseFacade(
  implementation: GoogleAppsScript.URL_Fetch.HTTPResponse,
  options: CreateHttpResponseFacadeOptions = {},
): GoogleAppsScript.URL_Fetch.HTTPResponse {
  const {
    createObject,
    createArray = defaultCreateGasArray,
    blobFacadeFactory = createBlobFacadeFactory(createObject),
  } = options;

  return createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => implementation.getContentText(),
          writable: true,
        },
        {
          name: "getAllHeaders",
          value: () => copyHeaders(implementation.getAllHeaders(), createObject, createArray),
          writable: true,
        },
        {
          name: "getAs",
          value: (contentType: string) =>
            blobFacadeFactory.create(implementation.getAs(contentType)),
          writable: true,
        },
        {
          name: "getBlob",
          value: () => blobFacadeFactory.create(implementation.getBlob()),
          writable: true,
        },
        {
          name: "getContent",
          value: () => copyArray(implementation.getContent(), createArray),
          writable: true,
        },
        {
          name: "getContentText",
          value: (charset?: string) =>
            charset === undefined
              ? implementation.getContentText()
              : implementation.getContentText(charset),
          writable: true,
        },
        {
          name: "getHeaders",
          value: () => copyHeaders(implementation.getHeaders(), createObject, createArray),
          writable: true,
        },
        {
          name: "getResponseCode",
          value: () => implementation.getResponseCode(),
          writable: true,
        },
      ],
    },
    createObject,
  ) as unknown as GoogleAppsScript.URL_Fetch.HTTPResponse;
}
