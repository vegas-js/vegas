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

test("rejects a development web app deployment URL", () => {
  expect(() =>
    createWebAppReferenceClient("https://script.google.com/macros/s/deployment-id/dev"),
  ).toThrow("Reference web app URL must end with /exec");
});

test("includes response diagnostics when a web app response is not JSON", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("<!doctype html><html>failure</html>", {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }),
    ),
  );

  const client = createWebAppReferenceClient(
    "https://script.google.com/macros/s/deployment-id/exec",
  );

  const error = await client
    .execute({
      method: "GET",
    })
    .then(
      () => null,
      (caught: unknown) => caught,
    );

  expect(error).toBeInstanceOf(Error);

  expect((error as Error).message).toContain("Apps Script web app response was not valid JSON");
  expect((error as Error).message).toContain(
    "requestUrl=https://script.google.com/macros/s/deployment-id/exec",
  );
  expect((error as Error).message).toContain("status=200");
  expect((error as Error).message).toContain("contentType=text/html; charset=utf-8");
  expect((error as Error).message).toContain("<!doctype html><html>failure</html>");
});

test("authenticates an opted-in web app request with OAuth", async () => {
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

  const accessTokenProvider = {
    getAccessToken: vi.fn(async () => "access-token"),
  };

  const client = createWebAppReferenceClient(
    "https://script.google.com/macros/s/deployment-id/exec",
    accessTokenProvider,
  );

  await client.execute({
    method: "GET",
    pathInfo: "path/to/resource",
    queryString: "a=1",
    authentication: "oauth",
  });

  expect(accessTokenProvider.getAccessToken).toHaveBeenCalledOnce();
  expect(fetchMock).toHaveBeenCalledOnce();

  const [requestUrl, init] = fetchMock.mock.calls[0]!;

  expect(requestUrl).toBe(
    "https://script.google.com/macros/s/deployment-id/exec/path/to/resource?a=1",
  );

  const headers = new Headers(init.headers);

  expect(headers.get("Authorization")).toBe("Bearer access-token");
});

test("rejects an OAuth web app request without an access token provider", async () => {
  vi.stubGlobal("fetch", vi.fn());

  const client = createWebAppReferenceClient(
    "https://script.google.com/macros/s/deployment-id/exec",
  );

  await expect(
    client.execute({
      method: "GET",
      authentication: "oauth",
    }),
  ).rejects.toThrow("OAuth-authenticated web app request requires an access token provider");
});

test("returns HTTP metadata for an unsuccessful web app response", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("<!doctype html><html>failure</html>", {
        status: 400,
        statusText: "Bad Request",
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }),
    ),
  );

  const client = createWebAppReferenceClient(
    "https://script.google.com/macros/s/deployment-id/exec",
  );

  await expect(
    client.execute({
      method: "POST",
      responseMode: "http",
    }),
  ).resolves.toEqual({
    status: 400,
    statusText: "Bad Request",
    ok: false,
    redirected: false,
    contentType: "text/html; charset=utf-8",
  });
});

test("returns HTTP metadata and body for a web app response", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response("response-body", {
      status: 200,
      statusText: "OK",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    }),
  );

  vi.stubGlobal("fetch", fetchMock);

  const client = createWebAppReferenceClient(
    "https://script.google.com/macros/s/deployment-id/exec",
  );

  await expect(
    client.execute({
      method: "GET",
      responseMode: "http-text",
    }),
  ).resolves.toEqual({
    status: 200,
    statusText: "OK",
    ok: true,
    redirected: false,
    contentType: "text/plain; charset=utf-8",
    body: "response-body",
  });
});

test("returns HTTP response details including content disposition", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response("response-body", {
      status: 200,
      statusText: "OK",

      headers: {
        "Content-Type": "text/plain; charset=utf-8",

        "Content-Disposition": 'attachment; filename="reference.txt"',
      },
    }),
  );

  vi.stubGlobal("fetch", fetchMock);

  const client = createWebAppReferenceClient(
    "https://script.google.com/macros/s/deployment-id/exec",
  );

  await expect(
    client.execute({
      method: "GET",

      responseMode: "http-details",
    }),
  ).resolves.toEqual({
    status: 200,
    statusText: "OK",
    ok: true,
    redirected: false,

    contentType: "text/plain; charset=utf-8",

    contentDisposition: 'attachment; filename="reference.txt"',

    body: "response-body",
  });
});
