import vm from "node:vm";

import { expect, test } from "vitest";

import { createVmGasArrayFactory, createVmGasObjectFactory } from "../../globals/object";
import type { RuntimeServicePort } from "../../protocol";
import { createBlobFacadeFactory } from "../base/blobFacade";
import { createUtilities } from "../utilities/facade";
import { createUrlFetchApp } from "./facade";

const unexpected = () => {
  throw new Error("Unexpected dependency call");
};

const service: RuntimeServicePort<"UrlFetch"> = {
  fetch: unexpected,
  fetchAll: unexpected,
};

test("creates GAS-compatible UrlFetchApp facade", () => {
  const urlFetchApp = createUrlFetchApp(service) as any;

  expect(Object.getOwnPropertyNames(urlFetchApp).sort()).toEqual(
    ["addOAuthService", "fetch", "fetchAll", "getRequest", "removeOAuthService", "toString"].sort(),
  );

  expect(Object.getPrototypeOf(urlFetchApp)).toBe(Object.prototype);
  expect(String(urlFetchApp)).toBe("UrlFetchApp");

  expect(urlFetchApp.getRequest("https://example.com")).toEqual({
    url: "https://example.com",
    method: "get",
    headers: {},
    contentType: null,
    payload: "",
    followRedirects: true,
    useIntranet: false,
    validateHttpsCertificates: true,
  });
});

test("returns target-realm HTTPResponse values from fetch and fetchAll", () => {
  const context = vm.createContext({});

  const createObject = createVmGasObjectFactory(context);

  const createArray = createVmGasArrayFactory(context);

  const blobFacadeFactory = createBlobFacadeFactory(createObject);

  const createResponse = () => ({
    headers: {
      "Content-Type": "text/plain",
    },
    content: Array.from(Buffer.from("response", "utf8")),
    responseCode: 200,
  });

  const service: RuntimeServicePort<"UrlFetch"> = {
    fetch: () => createResponse(),
    fetchAll: (requests) => requests.map(() => createResponse()),
  };

  const urlFetchApp = createUrlFetchApp(service, {
    createObject,
    createArray,
    blobFacadeFactory,
  }) as any;

  const responseA = urlFetchApp.fetch("https://example.com/");

  const responseB = urlFetchApp.fetch("https://example.com/");

  const responses = urlFetchApp.fetchAll(["https://example.com/", "https://example.com/"]);

  context.responseA = responseA;
  context.responses = responses;

  expect(responseA).not.toBe(responseB);

  expect(vm.runInContext("Object.getPrototypeOf(responseA) === Object.prototype", context)).toBe(
    true,
  );

  expect(vm.runInContext("Object.getPrototypeOf(responses) === Array.prototype", context)).toBe(
    true,
  );

  expect(responses[0]).not.toBe(responses[1]);
});

test("shares Blob facade identity infrastructure with Utilities", () => {
  const createResponse = () => ({
    headers: {
      "Content-Type": "text/plain",
    },
    content: Array.from(Buffer.from("response", "utf8")),
    responseCode: 200,
  });

  const service: RuntimeServicePort<"UrlFetch"> = {
    fetch: () => createResponse(),
    fetchAll: () => [],
  };

  const blobFacadeFactory = createBlobFacadeFactory();

  const urlFetchApp = createUrlFetchApp(service, {
    blobFacadeFactory,
  }) as any;

  const utilities = createUtilities(undefined, blobFacadeFactory) as any;

  const blob = urlFetchApp.fetch("https://example.com/").getBlob();

  expect("getBlob" in blob).toBe(false);

  expect(String(utilities.gzip(blob))).toBe("Blob");
});
