import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { createVmGasArrayFactory, createVmGasObjectFactory } from "../../globals/object";
import { createBlobFacadeFactory } from "../base/blobFacade";
import { HttpResponse } from "./HTTPResponse";
import { createHttpResponseFacade } from "./httpResponseFacade";

function createImplementation() {
  return new HttpResponse(
    {
      "Content-Type": "text/plain",
      "X-Reference": "Vegas",
    },
    Array.from(Buffer.from("vegas-reference-response", "utf8")),
    200,
  );
}

describe("createHttpResponseFacade", () => {
  test("creates HTTPResponse nested values in the supplied VM realm", () => {
    const context = vm.createContext({});

    const createObject = createVmGasObjectFactory(context);

    const createArray = createVmGasArrayFactory(context);

    const blobFacadeFactory = createBlobFacadeFactory(createObject);

    const response = createHttpResponseFacade(createImplementation(), {
      createObject,
      createArray,
      blobFacadeFactory,
    });

    const content = response.getContent();
    const headers = response.getHeaders();
    const blob = response.getBlob();

    context.response = response;
    context.content = content;
    context.headers = headers;
    context.blob = blob;

    expect(vm.runInContext("Object.getPrototypeOf(response) === Object.prototype", context)).toBe(
      true,
    );

    expect(vm.runInContext("Object.getPrototypeOf(content) === Array.prototype", context)).toBe(
      true,
    );

    expect(vm.runInContext("Object.getPrototypeOf(headers) === Object.prototype", context)).toBe(
      true,
    );

    expect(vm.runInContext("Object.getPrototypeOf(blob) === Object.prototype", context)).toBe(true);
  });

  test("creates GAS-compatible HTTPResponse own properties", () => {
    const response = createHttpResponseFacade(createImplementation());

    const methodNames = [
      "getAllHeaders",
      "getAs",
      "getBlob",
      "getContent",
      "getContentText",
      "getHeaders",
      "getResponseCode",
      "toString",
    ];

    expect(Object.getOwnPropertyNames(response).sort()).toEqual([...methodNames].sort());

    for (const name of methodNames) {
      expect(Object.getOwnPropertyDescriptor(response, name)).toMatchObject({
        configurable: true,
        enumerable: true,
        writable: true,
      });
    }

    expect(String(response as any)).toBe(response.getContentText());
  });

  test("preserves characterized HTTPResponse nested identity behavior", () => {
    const response = createHttpResponseFacade(createImplementation());

    expect(response.getContent()).not.toBe(response.getContent());

    expect(response.getHeaders()).not.toBe(response.getHeaders());

    expect(response.getBlob()).not.toBe(response.getBlob());

    const blob = response.getBlob();

    expect(String(blob as any)).toBe("Blob");
    expect("getBlob" in (blob as object)).toBe(false);
  });
});
