import { expect, test, vi } from "vitest";

import { UrlFetchApp } from "./UrlFetchApp";

const unexpected = () => {
  throw new Error("Unexpected dependency call");
};

test("getRequest() returns GAS-normalized defaults", () => {
  const fetch = vi.fn(() => ({
    headers: {
      "Content-Type": "text/plain",
    },
    content: [72, 101, 108, 108, 111],
    responseCode: 201,
  }));
  const app = new UrlFetchApp({ fetch, fetchAll: unexpected });

  expect(app.getRequest("https://example.com")).toEqual({
    url: "https://example.com",
    method: "get",
    contentType: null,
    headers: {},
    payload: "",
    followRedirects: true,
    useIntranet: false,
    validateHttpsCertificates: true,
  });
});

test("fetch() correctly constructs legacy requests", () => {
  const fetch = vi.fn(() => ({
    headers: {
      "Content-Type": "text/plain",
    },
    content: [72, 101, 108, 108, 111],
    responseCode: 201,
  }));
  const app = new UrlFetchApp({ fetch, fetchAll: unexpected });
  const response = app.fetch("https://example.com", {
    contentType: "text/plain",
    method: "post",
    headers: {
      "X-Test": "value",
    },
    payload: "hello",
  });

  expect(fetch).toHaveBeenCalledWith({
    url: "https://example.com",
    method: "post",
    headers: {
      "X-Test": "value",
      "Content-Type": "text/plain",
    },
    redirect: "follow",
    body: "hello",
  });
  expect(response.getResponseCode()).toBe(201);
  expect(response.getContent()).toEqual([72, 101, 108, 108, 111]);
  expect(response.getContentText()).toBe("Hello");
  expect(response.getHeaders()).toEqual({ "Content-Type": "text/plain" });
});

test("request order and response order for fetchAll()", () => {
  const fetchAll = vi.fn(() => [
    {
      responseCode: 201,
      headers: {
        "Content-Type": "text/plain",
      },
      content: [72, 101, 108, 108, 111],
    },
    {
      responseCode: 202,
      headers: {
        "Content-Type": "text/plain",
      },
      content: [72, 101, 108, 108, 111],
    },
  ]);
  const app = new UrlFetchApp({ fetch: unexpected, fetchAll });
  const responses = app.fetchAll([
    "https://example.com/a",
    {
      url: "https://example.com/b",
      method: "post",
      contentType: "text/plain",
      payload: "body",
    },
  ]);

  expect(fetchAll).toHaveBeenCalledWith([
    {
      url: "https://example.com/a",
      method: "get",
      headers: {},
      redirect: "follow",
    },
    {
      url: "https://example.com/b",
      method: "post",
      headers: {
        "Content-Type": "text/plain",
      },
      redirect: "follow",
      body: "body",
    },
  ]);
  expect(responses[0].getResponseCode()).toBe(201);
  expect(responses[1].getResponseCode()).toBe(202);
});

test("followRedirects true", () => {
  const fetch = vi.fn(() => ({
    headers: {
      "Content-Type": "text/plain",
    },
    content: [72, 101, 108, 108, 111],
    responseCode: 200,
  }));
  const app = new UrlFetchApp({ fetch, fetchAll: unexpected });
  app.fetch("https://example.com", {
    method: "post",
    contentType: "text/plain",
    followRedirects: true,
    payload: "hello",
  });

  expect(fetch).toHaveBeenCalledWith({
    url: "https://example.com",
    method: "post",
    headers: {
      "Content-Type": "text/plain",
    },
    redirect: "follow",
    body: "hello",
  });
});

test("getRequest() preserves explicit false boolean options", () => {
  const app = new UrlFetchApp({
    fetch: unexpected,
    fetchAll: unexpected,
  });

  const request = app.getRequest("https://example.com", {
    followRedirects: false,
    muteHttpExceptions: false,
    validateHttpsCertificates: false,
    escaping: false,
    useIntranet: false,
  }) as any;

  expect(request).toEqual({
    url: "https://example.com",
    method: "get",
    contentType: null,
    headers: {},
    payload: "",
    followRedirects: false,
    useIntranet: false,
    validateHttpsCertificates: false,
  });

  expect(Object.prototype.hasOwnProperty.call(request, "muteHttpExceptions")).toBe(false);

  expect(Object.prototype.hasOwnProperty.call(request, "escaping")).toBe(false);
});

test("getRequest() encodes object payload as form data", () => {
  const app = new UrlFetchApp({
    fetch: unexpected,
    fetchAll: unexpected,
  });

  expect(
    app.getRequest("https://example.com", {
      method: "post",
      payload: {
        alpha: "one",
        beta: "two",
      },
    }),
  ).toEqual({
    url: "https://example.com",
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    headers: {},
    payload: "alpha=one&beta=two",
    followRedirects: true,
    useIntranet: false,
    validateHttpsCertificates: true,
  });
});

test("fetch() omits Content-Type and body for the default GET", () => {
  const fetch = vi.fn(() => ({
    headers: {},
    content: [],
    responseCode: 200,
  }));

  const app = new UrlFetchApp({
    fetch,
    fetchAll: unexpected,
  });

  app.fetch("https://example.com");

  expect(fetch).toHaveBeenCalledWith({
    url: "https://example.com",
    method: "get",
    headers: {},
    redirect: "follow",
  });
});

test("fetch() throws the characterized GAS Exception for HTTP errors", () => {
  const fetch = vi.fn(() => ({
    headers: {},
    content: [],
    responseCode: 404,
  }));

  const app = new UrlFetchApp({
    fetch,
    fetchAll: unexpected,
  });

  try {
    app.fetch("https://httpbingo.org/status/404");

    throw new Error("Expected fetch to throw");
  } catch (error) {
    expect((error as Error).name).toBe("Exception");

    expect((error as Error).message).toBe(
      "Request failed for https://httpbingo.org returned code 404",
    );
  }
});

test("fetch() returns HTTP errors when muteHttpExceptions is true", () => {
  const fetch = vi.fn(() => ({
    headers: {},
    content: [],
    responseCode: 404,
  }));

  const app = new UrlFetchApp({
    fetch,
    fetchAll: unexpected,
  });

  const response = app.fetch("https://httpbingo.org", {
    muteHttpExceptions: true,
  });

  expect(response.getResponseCode()).toBe(404);
});

test("fetchAll() applies muteHttpExceptions per request", () => {
  const fetchAll = vi.fn(() => [
    {
      headers: {},
      content: [],
      responseCode: 404,
    },
  ]);

  const app = new UrlFetchApp({
    fetch: unexpected,
    fetchAll,
  });

  const responses = app.fetchAll([
    {
      url: "https://httpbingo.org",
      muteHttpExceptions: true,
    },
  ]);

  expect(responses.map((response) => response.getResponseCode())).toEqual([404]);
});
