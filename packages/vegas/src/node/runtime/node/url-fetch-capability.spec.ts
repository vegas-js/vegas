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

  test("enforce URL length limits for direct host fetch and fetchAll", async () => {
    const send = vi.fn(async () => new Response(null));
    const capability = new NodeUrlFetchCapability(send);
    const prefix = "https://example.com/";
    const maximum = prefix + "a".repeat(2_082 - prefix.length);
    const oversized = `${maximum}a`;

    await expect(capability.fetch({ url: oversized })).rejects.toThrow(
      "UrlFetch URL must not exceed 2082 characters.",
    );
    await expect(capability.fetchAll([{ url: maximum }, { url: oversized }])).rejects.toThrow(
      RangeError,
    );
    expect(send).not.toHaveBeenCalled();

    await expect(capability.fetch({ url: maximum })).resolves.toMatchObject({
      statusCode: 200,
    });
    expect(send).toHaveBeenCalledOnce();
  });

  test("serialize streamed response chunks and empty response bodies", async () => {
    const capability = new NodeUrlFetchCapability(async (url) => {
      if (url.endsWith("/empty")) {
        return new Response(null);
      }

      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(Uint8Array.from([0, 127]));
            controller.enqueue(Uint8Array.from([128, 255]));
            controller.close();
          },
        }),
      );
    });

    await expect(capability.fetch({ url: "https://example.com/chunks" })).resolves.toMatchObject({
      content: [0, 127, -128, -1],
    });
    await expect(capability.fetch({ url: "https://example.com/empty" })).resolves.toMatchObject({
      content: [],
    });
  });

  test("reject oversized response bodies and cancel their streams", async () => {
    const cancel = vi.fn();
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(50 * 1024 * 1024 + 1));
        },
        cancel,
      }),
      { headers: { "content-length": "1" } },
    );
    const capability = new NodeUrlFetchCapability(async () => response);

    await expect(capability.fetch({ url: "https://example.com/oversized" })).rejects.toThrow(
      "UrlFetch response exceeds the local 50 MB size limit.",
    );
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
  });

  test("preserve special JavaScript property names in response headers", async () => {
    const headers = new Headers([
      ["__proto__", "prototype-header"],
      ["constructor", "constructor-header"],
      ["toString", "method-header"],
    ]);
    const capability = new NodeUrlFetchCapability(async () => new Response(null, { headers }));

    const response = await capability.fetch({ url: "https://example.com/headers" });

    expect(response.headers).toStrictEqual(
      Object.fromEntries([
        ["__proto__", "prototype-header"],
        ["constructor", "constructor-header"],
        ["tostring", "method-header"],
      ]),
    );
    expect(Object.getPrototypeOf(response.headers)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(response.headers, "__proto__")?.value).toBe(
      "prototype-header",
    );
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

  test("use the documented default Content-Type for text and byte bodies", async () => {
    const sent: Headers[] = [];
    const capability = new NodeUrlFetchCapability(async (_url, init) => {
      sent.push(new Headers(init.headers));
      return new Response(null);
    });

    await capability.fetch({
      url: "https://example.com/text",
      method: "post",
      payload: { kind: "text", value: "hello" },
    });
    await capability.fetch({
      url: "https://example.com/bytes",
      method: "post",
      payload: { kind: "bytes", value: [65, 66] },
    });
    await capability.fetch({
      url: "https://example.com/blob",
      method: "post",
      payload: {
        kind: "blob",
        value: { bytes: [67], contentType: null, name: null, googleType: false },
      },
    });
    await capability.fetch({
      url: "https://example.com/explicit",
      method: "post",
      contentType: "application/json",
      payload: { kind: "text", value: "{}" },
    });
    await capability.fetch({
      url: "https://example.com/header",
      method: "post",
      headers: { "Content-Type": "text/custom" },
      payload: { kind: "text", value: "hello" },
    });
    await capability.fetch({ url: "https://example.com/no-body" });

    expect(sent.map((headers) => headers.get("content-type"))).toStrictEqual([
      "application/x-www-form-urlencoded",
      "application/x-www-form-urlencoded",
      "application/x-www-form-urlencoded",
      "application/json",
      "text/custom",
      null,
    ]);
  });

  test("enforce the 100-header limit before dispatching UrlFetch requests", async () => {
    const send = vi.fn(async () => new Response(null));
    const capability = new NodeUrlFetchCapability(send);
    const headers = Object.fromEntries(
      Array.from({ length: 100 }, (_, index) => [`x-vegas-${index}`, "value"]),
    );
    const oversized = { ...headers, "x-vegas-extra": "value" };

    await expect(
      capability.fetch({ url: "https://example.com/headers", headers }),
    ).resolves.toMatchObject({ statusCode: 200 });
    expect(send).toHaveBeenCalledOnce();

    await expect(
      capability.fetch({ url: "https://example.com/too-many", headers: oversized }),
    ).rejects.toThrow("UrlFetch request must not exceed 100 headers.");
    await expect(
      capability.fetchAll([
        { url: "https://example.com/valid" },
        { url: "https://example.com/too-many", headers: oversized },
      ]),
    ).rejects.toThrow(RangeError);
    expect(send).toHaveBeenCalledOnce();

    // The automatically added Content-Type also counts toward the local limit.
    await expect(
      capability.fetch({
        url: "https://example.com/post",
        method: "post",
        headers,
        payload: { kind: "text", value: "hello" },
      }),
    ).rejects.toThrow("UrlFetch request must not exceed 100 headers.");
    expect(send).toHaveBeenCalledOnce();
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

  test("wait for in-flight fetchAll requests before reporting a sibling failure", async () => {
    const error = new Error("first fetch failed");
    let finishSecond: (response: Response) => void = () => {
      throw new Error("Second fetch was not started.");
    };
    const capability = new NodeUrlFetchCapability(async (url) => {
      if (url.endsWith("/failure")) {
        throw error;
      }

      return new Promise<Response>((resolve) => {
        finishSecond = resolve;
      });
    });
    const settled = vi.fn();
    const pending = capability.fetchAll([
      { url: "https://example.com/failure" },
      { url: "https://example.com/slow" },
    ]);
    void pending.then(settled, settled);

    // The first fetch rejects immediately, but the batch must not finish
    // while the second request is still active.
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(settled).not.toHaveBeenCalled();

    finishSecond(new Response("ok"));
    await expect(pending).rejects.toBe(error);
    expect(settled).toHaveBeenCalledOnce();
  });

  test("reject invalid fetchAll batches before dispatching any request", async () => {
    const send = vi.fn(async () => new Response(null));
    const capability = new NodeUrlFetchCapability(send);
    const valid = { url: "https://example.com/valid" } as const;
    const invalidMethod = {
      url: "https://example.com/invalid-method",
      payload: { kind: "text", value: "unexpected body" },
    } as const satisfies UrlFetchRequestValue;
    const invalidHeaders = {
      url: "https://example.com/invalid-header",
      headers: { "invalid header name": "value" },
    } as const satisfies UrlFetchRequestValue;

    // A valid request at either position must not dispatch if another entry is invalid.
    await expect(capability.fetchAll([valid, invalidMethod])).rejects.toThrow(
      "UrlFetch GET requests cannot include a payload.",
    );
    await expect(capability.fetchAll([invalidMethod, valid])).rejects.toThrow(TypeError);
    await expect(capability.fetchAll([valid, invalidHeaders])).rejects.toThrow(TypeError);
    await expect(
      capability.fetchAll([
        valid,
        { url: "https://example.com/invalid-timeout", timeoutSeconds: 0 },
      ]),
    ).rejects.toThrow("UrlFetch timeoutSeconds must be a positive integer.");

    expect(send).not.toHaveBeenCalled();
  });

  test("enforce timeouts when a custom fetch ignores AbortSignal", async () => {
    vi.useFakeTimers();

    try {
      let requestSignal: AbortSignal | undefined;
      const capability = new NodeUrlFetchCapability(async (_url, init) => {
        requestSignal = init.signal ?? undefined;
        // This transport never settles, even after its signal is aborted.
        return new Promise<Response>(() => undefined);
      });

      const pending = capability.fetch({ url: "https://example.com/stuck", timeoutSeconds: 1 });
      const rejection = expect(pending).rejects.toMatchObject({ name: "TimeoutError" });

      await vi.advanceTimersByTimeAsync(1_000);
      await rejection;
      expect(requestSignal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  test("cancel response bodies returned after an invocation was aborted", async () => {
    let finishFetch: (response: Response) => void = () => {
      throw new Error("Fetch was not started.");
    };
    const capability = new NodeUrlFetchCapability(
      async () =>
        new Promise<Response>((resolve) => {
          finishFetch = resolve;
        }),
    );
    const controller = new AbortController();
    const reason = new Error("invocation cancelled");
    const pending = capability.fetch({ url: "https://example.com/late" }, controller.signal);

    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);

    const cancel = vi.fn();
    finishFetch(new Response(new ReadableStream<Uint8Array>({ cancel })));

    // Let the late transport result finish its asynchronous cleanup.
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(cancel).toHaveBeenCalledOnce();
  });

  test("cancel response bodies when an invocation aborts during reading", async () => {
    const cancel = vi.fn();
    const response = new Response(
      new ReadableStream<Uint8Array>({
        pull: () => new Promise<void>(() => undefined),
        cancel,
      }),
    );
    const capability = new NodeUrlFetchCapability(async () => response);
    const controller = new AbortController();
    const reason = new Error("invocation cancelled during response reading");
    const pending = capability.fetch({ url: "https://example.com/slow-body" }, controller.signal);

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(response.body?.locked).toBe(true);

    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    expect(cancel).toHaveBeenCalledOnce();
  });

  test("enforce timeouts while a custom response body remains unreadable", async () => {
    vi.useFakeTimers();

    try {
      const cancel = vi.fn();
      const capability = new NodeUrlFetchCapability(
        async () =>
          new Response(
            new ReadableStream<Uint8Array>({
              pull: () => new Promise<void>(() => undefined),
              cancel,
            }),
          ),
      );

      const pending = capability.fetch({
        url: "https://example.com/stuck-body",
        timeoutSeconds: 1,
      });
      const rejection = expect(pending).rejects.toMatchObject({ name: "TimeoutError" });

      await vi.advanceTimersByTimeAsync(1_000);
      await rejection;
      expect(cancel).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  test("finish fetchAll after a non-cooperative sibling times out", async () => {
    vi.useFakeTimers();

    try {
      const error = new Error("first request failed");
      const dispatch = vi.fn(async (url: string) => {
        if (url.endsWith("/failure")) {
          throw error;
        }
        return new Promise<Response>(() => undefined);
      });
      const capability = new NodeUrlFetchCapability(dispatch);
      const pending = capability.fetchAll([
        { url: "https://example.com/failure" },
        { url: "https://example.com/slow", timeoutSeconds: 1 },
      ]);
      const rejection = expect(pending).rejects.toBe(error);

      await vi.advanceTimersByTimeAsync(1_000);
      await rejection;
      expect(dispatch).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
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
