import { describe, expect, test } from "vitest";

import type { UrlFetchRequestValue } from "./index";
import { NodeUrlFetchCapability } from "./node";

describe("NodeUrlFetchCapability", () => {
  test("map a request through fetch and serialize the response", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const capability = new NodeUrlFetchCapability(async (url, init) => {
      calls.push({ url, init });
      return new Response(Uint8Array.from([255, 65]), {
        status: 200,
        headers: {
          "content-type": "application/octet-stream",
        },
      });
    });

    await expect(
      capability.fetch({
        url: "https://example.com/data",
        headers: {
          Accept: "application/octet-stream",
        },
        timeoutSeconds: 30,
      }),
    ).resolves.toStrictEqual({
      statusCode: 200,
      headers: {
        "content-type": "application/octet-stream",
      },
      content: [-1, 65],
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://example.com/data");
    expect(calls[0]?.init.method).toBe("get");
    expect(calls[0]?.init.redirect).toBe("follow");
    expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);

    const headers = new Headers(calls[0]?.init.headers);
    expect(headers.get("accept")).toBe("application/octet-stream");
  });

  test("map text payload, content type, redirect mode, and muted HTTP failures", async () => {
    const calls: RequestInit[] = [];
    const capability = new NodeUrlFetchCapability(async (_url, init) => {
      calls.push(init);
      return new Response("missing", {
        status: 404,
        headers: {
          "content-type": "text/plain",
        },
      });
    });

    await expect(
      capability.fetch({
        url: "https://example.com/missing",
        method: "post",
        contentType: "application/json",
        payload: {
          kind: "text",
          value: '{"name":"Vegas"}',
        },
        followRedirects: false,
        muteHttpExceptions: true,
      }),
    ).resolves.toMatchObject({
      statusCode: 404,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("post");
    expect(calls[0]?.body).toBe('{"name":"Vegas"}');
    expect(calls[0]?.redirect).toBe("manual");
    expect(new Headers(calls[0]?.headers).get("content-type")).toBe("application/json");
  });

  test("encode string form payloads as application/x-www-form-urlencoded", async () => {
    const calls: RequestInit[] = [];
    const capability = new NodeUrlFetchCapability(async (_url, init) => {
      calls.push(init);
      return new Response("ok");
    });

    await capability.fetch({
      url: "https://example.com/form",
      method: "post",
      payload: {
        kind: "form",
        fields: {
          name: "Vegas",
          message: "Hello World",
        },
      },
    });

    expect(calls).toHaveLength(1);

    const body = calls[0]?.body;
    expect(body).toBeInstanceOf(URLSearchParams);

    if (!(body instanceof URLSearchParams)) {
      throw new Error("expected URLSearchParams body");
    }

    expect(body.toString()).toBe("name=Vegas&message=Hello+World");
    expect(new Headers(calls[0]?.headers).get("content-type")).toBe(
      "application/x-www-form-urlencoded",
    );
  });

  test("encode Blob form fields as multipart FormData", async () => {
    const calls: RequestInit[] = [];
    const capability = new NodeUrlFetchCapability(async (_url, init) => {
      calls.push(init);
      return new Response("ok");
    });

    await capability.fetch({
      url: "https://example.com/form",
      method: "post",
      payload: {
        kind: "form",
        fields: {
          name: "Vegas",
          attachment: {
            bytes: [86, 101, 103, 97, 115],
            contentType: "text/plain",
            name: "vegas.txt",
            googleType: false,
          },
        },
      },
    });

    expect(calls).toHaveLength(1);

    const body = calls[0]?.body;
    expect(body).toBeInstanceOf(FormData);

    if (!(body instanceof FormData)) {
      throw new Error("expected multipart FormData body");
    }

    expect(body.get("name")).toBe("Vegas");

    const attachment = body.get("attachment");
    expect(attachment).toBeInstanceOf(Blob);

    if (!(attachment instanceof Blob)) {
      throw new Error("expected Blob form field");
    }

    expect(attachment.type).toBe("text/plain");
    expect(Array.from(new Uint8Array(await attachment.arrayBuffer()))).toStrictEqual([
      86, 101, 103, 97, 115,
    ]);
    expect(attachment).toMatchObject({
      name: "vegas.txt",
    });
    expect(new Headers(calls[0]?.headers).has("content-type")).toBe(false);
  });

  test("reject payload when the default request method is GET", async () => {
    let calls = 0;
    const capability = new NodeUrlFetchCapability(async () => {
      calls += 1;
      return new Response();
    });

    await expect(
      capability.fetch({
        url: "https://example.com",
        payload: {
          kind: "text",
          value: "body",
        },
      }),
    ).rejects.toThrow("GET requests cannot include a payload");

    expect(calls).toBe(0);
  });

  test("throw for HTTP failures unless muteHttpExceptions is enabled", async () => {
    const capability = new NodeUrlFetchCapability(async () => {
      return new Response("failed", { status: 500 });
    });

    await expect(
      capability.fetch({
        url: "https://example.com/failure",
      }),
    ).rejects.toThrow("UrlFetch request failed with HTTP status 500.");
  });

  test("preserve fetchAll result order", async () => {
    const capability = new NodeUrlFetchCapability(async (url) => {
      const suffix = url.endsWith("/a") ? "A" : "B";
      return new Response(suffix, {
        status: url.endsWith("/a") ? 200 : 201,
      });
    });
    const requests = [
      { url: "https://example.com/a" },
      { url: "https://example.com/b" },
    ] as const satisfies readonly UrlFetchRequestValue[];

    await expect(capability.fetchAll(requests)).resolves.toMatchObject([
      {
        statusCode: 200,
      },
      {
        statusCode: 201,
      },
    ]);
  });

  test("reject options that native fetch cannot faithfully represent", async () => {
    let calls = 0;
    const capability = new NodeUrlFetchCapability(async () => {
      calls += 1;
      return new Response();
    });

    await expect(
      capability.fetch({
        url: "https://example.com",
        validateHttpsCertificates: false,
      }),
    ).rejects.toThrow("validateHttpsCertificates=false");
    await expect(
      capability.fetch({
        url: "https://example.com",
        escaping: false,
      }),
    ).rejects.toThrow("escaping=false");
    await expect(
      capability.fetch({
        url: "https://example.com",
        useIntranet: true,
      }),
    ).rejects.toThrow("useIntranet=true");

    expect(calls).toBe(0);
  });
});
