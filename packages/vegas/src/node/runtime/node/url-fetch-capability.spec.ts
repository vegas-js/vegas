import { describe, expect, test, vi } from "vitest";

import { UnsupportedRuntimeOperationError } from "../unsupported-runtime-operation-error";
import type { UrlFetchRequestValue } from "../url-fetch/value";
import { NodeUrlFetchCapability } from "./url-fetch-capability";

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

  test("abort an in-flight fetch when the invocation is cancelled", async () => {
    let requestSignal: AbortSignal | undefined;
    const capability = new NodeUrlFetchCapability(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          requestSignal = init.signal ?? undefined;

          requestSignal?.addEventListener(
            "abort",
            () => {
              reject(requestSignal?.reason);
            },
            { once: true },
          );
        }),
    );
    const controller = new AbortController();
    const reason = new Error("execution cancelled");

    const pending = capability.fetch(
      {
        url: "https://example.com/slow",
        timeoutSeconds: 30,
      },
      controller.signal,
    );

    expect(requestSignal).toBeInstanceOf(AbortSignal);
    expect(requestSignal?.aborted).toBe(false);

    controller.abort(reason);

    await expect(pending).rejects.toBe(reason);
    expect(requestSignal?.aborted).toBe(true);
  });

  test("do not dispatch already-aborted fetch and fetchAll requests", async () => {
    vi.useFakeTimers();
    try {
      const send = vi.fn(async () => new Response("unexpected"));
      const capability = new NodeUrlFetchCapability(send);
      const controller = new AbortController();
      const reason = new Error("execution already cancelled");
      controller.abort(reason);

      await expect(
        capability.fetch({ url: "https://example.com/a" }, controller.signal),
      ).rejects.toBe(reason);
      await expect(
        capability.fetchAll(
          [{ url: "https://example.com/a" }, { url: "https://example.com/b" }],
          controller.signal,
        ),
      ).rejects.toBe(reason);

      expect(send).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  test("keep large UrlFetch timeouts pending and dispose the timer on success", async () => {
    vi.useFakeTimers();
    try {
      let requestSignal: AbortSignal | undefined;
      let respond: (response: Response) => void = () => {
        throw new Error("Fetch was not started.");
      };
      const capability = new NodeUrlFetchCapability(async (_url, init) => {
        requestSignal = init.signal ?? undefined;
        return new Promise<Response>((resolve) => {
          respond = resolve;
        });
      });

      const pending = capability.fetch({
        url: "https://example.com/long",
        timeoutSeconds: 2_147_484,
      });

      await vi.advanceTimersByTimeAsync(10);
      expect(requestSignal).toBeInstanceOf(AbortSignal);
      expect(requestSignal?.aborted).toBe(false);

      respond(new Response("ok"));
      await expect(pending).resolves.toMatchObject({ statusCode: 200 });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  test("abort timed-out fetches and clear their timers", async () => {
    vi.useFakeTimers();
    try {
      const capability = new NodeUrlFetchCapability(
        async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
              once: true,
            });
          }),
      );

      const pending = capability.fetch({ url: "https://example.com/slow", timeoutSeconds: 1 });
      const rejection = expect(pending).rejects.toMatchObject({ name: "TimeoutError" });
      await vi.advanceTimersByTimeAsync(1_000);
      await rejection;
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  test("reject durations beyond the local safe range without starting fetch", async () => {
    const fetch = vi.fn(async () => new Response());
    const capability = new NodeUrlFetchCapability(fetch);

    await expect(
      capability.fetch({
        url: "https://example.com/long",
        timeoutSeconds: Math.floor(Number.MAX_SAFE_INTEGER / 1_000) + 1,
      }),
    ).rejects.toThrow("UrlFetch timeoutSeconds exceeds the local safe duration limit.");
    expect(fetch).not.toHaveBeenCalled();
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
    ).rejects.toThrow(TypeError);

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

  test("cancel unread response bodies when an HTTP request fails", async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream<Uint8Array>({ cancel }), { status: 503 });
    const capability = new NodeUrlFetchCapability(async () => response);

    await expect(capability.fetch({ url: "https://example.com/unavailable" })).rejects.toThrow(
      "UrlFetch request failed with HTTP status 503.",
    );
    expect(cancel).toHaveBeenCalledOnce();
  });

  test("preserve HTTP errors when cancelling response bodies fails", async () => {
    const cancel = vi.fn(() => Promise.reject(new Error("body cancellation failed")));
    const response = new Response(new ReadableStream<Uint8Array>({ cancel }), { status: 502 });
    const capability = new NodeUrlFetchCapability(async () => response);

    await expect(capability.fetch({ url: "https://example.com/unavailable" })).rejects.toThrow(
      "UrlFetch request failed with HTTP status 502.",
    );
    expect(cancel).toHaveBeenCalledOnce();
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
    ).rejects.toThrow(UnsupportedRuntimeOperationError);
    await expect(
      capability.fetch({
        url: "https://example.com",
        escaping: false,
      }),
    ).rejects.toThrow(UnsupportedRuntimeOperationError);
    await expect(
      capability.fetch({
        url: "https://example.com",
        useIntranet: true,
      }),
    ).rejects.toThrow(UnsupportedRuntimeOperationError);

    await expect(
      capability.fetch({
        url: "https://example.com",
        escaping: false,
      }),
    ).rejects.toThrow(
      "Local Runtime does not support UrlFetchApp.fetch()/fetchAll(): escaping=false cannot be represented by the Node Local Runtime.",
    );

    expect(calls).toBe(0);
  });
});
