import { expect, test, vi } from "vitest";

import { UrlFetchApp } from "./UrlFetchApp";

const unexpected = () => {
  throw new Error("Unexpected dependency call");
};

test("getRequest() returns default value", () => {
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
    contentType: "application/x-www-form-urlencoded",
    headers: {},
    method: "get",
    payload: undefined,
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
      payload: "body",
    },
  ]);

  expect(fetchAll).toHaveBeenCalledWith([
    {
      url: "https://example.com/a",
    },
    {
      url: "https://example.com/b",
      method: "post",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
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
