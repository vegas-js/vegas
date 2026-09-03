import { expect, test } from "vitest";

import type { RuntimeServicePort } from "../../protocol";
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
    contentType: "application/x-www-form-urlencoded",
    headers: {},
    method: "get",
    payload: undefined,
  });
});
