import { afterEach, expect, test, vi } from "vitest";

import { createWebAppReferenceClient } from "./webAppClient";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("executes a web app GET request and parses its JSON response", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        value: "result",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  vi.stubGlobal("fetch", fetchMock);

  const client = createWebAppReferenceClient(
    "https://script.google.com/macros/s/deployment-id/exec",
  );

  await expect(
    client.execute({
      method: "GET",
      pathInfo: "path/to/resource",
      queryString: "a=1&a=2",
    }),
  ).resolves.toEqual({
    value: "result",
  });

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock).toHaveBeenCalledWith(
    "https://script.google.com/macros/s/deployment-id/exec/path/to/resource?a=1&a=2",
    {
      method: "GET",
      headers: undefined,
      body: undefined,
    },
  );
});

test("preserves a web app POST body and request headers", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        value: "result",
      }),
      {
        status: 200,
      },
    ),
  );

  vi.stubGlobal("fetch", fetchMock);

  const client = createWebAppReferenceClient(
    "https://script.google.com/macros/s/deployment-id/exec",
  );

  await client.execute({
    method: "POST",
    queryString: "source=query",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
    body: "こんにちは",
  });

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock).toHaveBeenCalledWith(
    "https://script.google.com/macros/s/deployment-id/exec?source=query",
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: "こんにちは",
    },
  );
});

test("returns the raw web app response when text mode is requested", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("plain text", {
        status: 200,
      }),
    ),
  );

  const client = createWebAppReferenceClient(
    "https://script.google.com/macros/s/deployment-id/exec",
  );

  await expect(
    client.execute({
      method: "GET",
      responseMode: "text",
    }),
  ).resolves.toBe("plain text");
});

test("rejects an unsuccessful web app response", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("not allowed", {
        status: 405,
        statusText: "Method Not Allowed",
      }),
    ),
  );

  const client = createWebAppReferenceClient(
    "https://script.google.com/macros/s/deployment-id/exec",
  );

  await expect(
    client.execute({
      method: "GET",
    }),
  ).rejects.toThrow("Apps Script web app request failed: 405 Method Not Allowed: not allowed");
});
