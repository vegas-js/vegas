import { expect, test, vi } from "vitest";

import { UrlFetchApp } from "./UrlFetchApp";

const unexpected = () => {
  throw new Error("Unexpected dependency call");
};

test("getRequest() returns default value", () => {
  const app = new UrlFetchApp(unexpected);

  expect(app.getRequest("https://example.com")).toEqual({
    url: "https://example.com",
    contentType: "application/x-www-form-urlencoded",
    headers: {},
    method: "get",
    payload: undefined,
  });
});

test("fetch() correctly constructs legacy requests", () => {
  const requestSync = vi.fn(() => {
    return {
      headers: { "Content-Type": "text/plain" },
      content: [72, 101, 108, 108, 111],
      responseCode: 201,
    };
  });
  const app = new UrlFetchApp(requestSync);
  const response = app.fetch("https://example.com", {
    contentType: "text/plain",
    method: "post",
    headers: {
      "X-Test": "value",
    },
    payload: "hello",
  });

  expect(requestSync).toHaveBeenCalledWith({
    message: "UrlFetchApp#fetch",
    payload: {
      url: "https://example.com",
      init: {
        method: "post",
        headers: {
          "X-Test": "value",
          "Content-Type": "text/plain",
        },
        redirect: "follow",
        body: "hello",
      },
    },
  });
  expect(response.getResponseCode()).toBe(201);
  expect(response.getContent()).toEqual([72, 101, 108, 108, 111]);
  expect(response.getContentText()).toBe("Hello");
  expect(response.getHeaders()).toEqual({ "Content-Type": "text/plain" });
});

test("request order and response order for fetchAll()", () => {
  const requestSync = vi.fn(() => {
    return [
      {
        responseCode: 201,
      },
      {
        responseCode: 202,
      },
    ];
  });
  const app = new UrlFetchApp(requestSync);
  const responses = app.fetchAll([
    "https://example.com/a",
    {
      url: "https://example.com/b",
      method: "post",
      payload: "body",
    },
  ]);

  expect(requestSync).toHaveBeenCalledWith({
    message: "UrlFetchApp#fetchAll",
    payload: {
      fetchRequests: [
        {
          url: "https://example.com/a",
        },
        {
          url: "https://example.com/b",
          init: {
            method: "post",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            redirect: "follow",
            body: "body",
          },
        },
      ],
    },
  });
  expect(responses[0].getResponseCode()).toBe(201);
  expect(responses[1].getResponseCode()).toBe(202);
});

test("followRedirects true", () => {
  const requestSync = vi.fn(() => {
    return {
      responseCode: 200,
    };
  });
  const app = new UrlFetchApp(requestSync);
  app.fetch("https://example.com", {
    method: "post",
    contentType: "text/plain",
    followRedirects: true,
    payload: "hello",
  });

  expect(requestSync).toHaveBeenCalledWith({
    message: "UrlFetchApp#fetch",
    payload: {
      url: "https://example.com",
      init: {
        method: "post",
        headers: {
          "Content-Type": "text/plain",
        },
        redirect: "follow",
        body: "hello",
      },
    },
  });
});
