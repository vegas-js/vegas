import { EventEmitter } from "node:events";
import { Readable } from "node:stream";

import type { ViteDevServer } from "vite";
import { describe, expect, test, vi } from "vitest";

import { createHostHttpHandler } from "./host-http-handler";

type HostHttpHandler = ReturnType<typeof createHostHttpHandler>;
type HostRequest = Parameters<HostHttpHandler>[0];
type HostResponse = Parameters<HostHttpHandler>[1];

function createRequest(
  method: string,
  url: string,
  headers: HostRequest["headers"],
  body?: string,
): HostRequest {
  return Object.assign(Readable.from(body === undefined ? [] : [body]), {
    method,
    url,
    headers,
  }) as unknown as HostRequest;
}

function createServer(mode: "development" | "production" = "development") {
  const transformIndexHtml = vi.fn(async (_url: string, html: string) => html);
  const server = {
    config: {
      mode,
      server: {
        https: false,
      },
    },
    transformIndexHtml,
  } as unknown as ViteDevServer;

  return { server, transformIndexHtml };
}

function createResponse() {
  const headers = new Map<string, string>();
  let body: unknown;
  const end = vi.fn((value?: unknown) => {
    body = value;
  });
  const response = Object.assign(new EventEmitter(), {
    statusCode: 0,
    setHeader: vi.fn((name: string, value: string) => {
      headers.set(name, value);
    }),
    end,
  }) as unknown as HostResponse;

  return {
    response,
    headers,
    end,
    getBody: () => body,
  };
}

describe("createHostHttpHandler", () => {
  test("redirect root requests to the current web app endpoint", async () => {
    const { response, headers } = createResponse();
    const next = vi.fn();
    const waitForIdle = vi.fn(async () => undefined);

    const handler = createHostHttpHandler({
      server: createServer().server,
      builds: { waitForIdle },
      contentResponses: { issue: () => "content-1" },
      sessions: { issue: () => "session-1" },
      runtime: { execute: async () => undefined },
      userContentPort: 62000,
    });

    await Promise.resolve(
      handler(
        createRequest("GET", "/?name=alice", {
          host: "localhost:5173",
        }),
        response,
        next,
      ),
    );

    expect(waitForIdle).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(307);
    expect(headers.get("Location")).toBe("/dev?name=alice");
    expect(next).not.toHaveBeenCalled();
  });

  test("execute doGet and return transformed host html", async () => {
    const { server, transformIndexHtml } = createServer();
    const { response, headers, getBody } = createResponse();
    const execute = vi.fn(async (request) => {
      expect(request.functionName).toBe("doGet");
      expect(request.args[0].parameter).toStrictEqual({ name: "alice" });
      expect(request.context).toStrictEqual({
        webApp: true,
        userAgent: "Vegas Browser",
      });
      expect(request.signal).toBeInstanceOf(AbortSignal);
      expect(request).not.toHaveProperty("program");
      return {
        kind: "html",
        output: {
          metaTags: [],
          title: "",
          faviconUrl: "",
          content: "<main>Hello</main>",
          xFrameOptionsMode: "DEFAULT",
        },
      };
    });

    const handler = createHostHttpHandler({
      server,
      builds: { waitForIdle: async () => undefined },
      contentResponses: { issue: () => "content-1" },
      sessions: { issue: () => "session-1" },
      runtime: { execute },
      userContentPort: 62000,
    });

    await Promise.resolve(
      handler(
        createRequest("GET", "/dev?name=alice", {
          host: "localhost:5173",
          "user-agent": "Vegas Browser",
        }),
        response,
        vi.fn(),
      ),
    );

    expect(response.statusCode).toBe(200);
    expect(headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(String(getBody())).toContain(
      'src="http://localhost:62000/userCodeAppPanel?sessionId=session-1"',
    );
    expect(transformIndexHtml).toHaveBeenCalledWith(
      "http://localhost:5173/dev?name=alice",
      expect.any(String),
    );
  });

  test("execute doPost HtmlOutput through the web app host", async () => {
    const { server, transformIndexHtml } = createServer();
    const { response, headers, getBody } = createResponse();
    const execute = vi.fn(async (request) => {
      expect(request.functionName).toBe("doPost");
      expect(request.args[0].postData.contents).toBe("hello");
      expect(request.context).toStrictEqual({
        webApp: true,
        userAgent: "Vegas Browser",
      });
      expect(request.signal).toBeInstanceOf(AbortSignal);
      expect(request).not.toHaveProperty("program");
      return {
        kind: "html",
        output: {
          metaTags: [],
          title: "",
          faviconUrl: "",
          content: "<main>posted</main>",
          xFrameOptionsMode: "DEFAULT",
        },
      };
    });

    const handler = createHostHttpHandler({
      server,
      builds: { waitForIdle: async () => undefined },
      contentResponses: { issue: () => "content-1" },
      sessions: { issue: () => "session-1" },
      runtime: { execute },
      userContentPort: 62000,
    });

    const request = createRequest(
      "POST",
      "/exec",
      {
        host: "localhost:5173",
        "content-type": "text/plain",
        "user-agent": "Vegas Browser",
      },
      "hello",
    );

    await Promise.resolve(handler(request, response, vi.fn()));

    expect(response.statusCode).toBe(200);
    expect(headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(String(getBody())).toContain(
      'src="http://localhost:62000/userCodeAppPanel?sessionId=session-1"',
    );
    expect(transformIndexHtml).toHaveBeenCalledWith(
      "http://localhost:5173/exec",
      expect.any(String),
    );
  });

  test("reject invalid doGet Runtime result", async () => {
    const { response, end } = createResponse();
    const next = vi.fn();
    const handler = createHostHttpHandler({
      server: createServer().server,
      builds: { waitForIdle: async () => undefined },
      contentResponses: { issue: () => "content-1" },
      sessions: { issue: () => "session-1" },
      runtime: {
        execute: async () => ({
          kind: "html",
          output: {
            content: "<main>Hello</main>",
          },
        }),
      },
      userContentPort: 62000,
    });

    await Promise.resolve(
      handler(
        createRequest("GET", "/dev", {
          host: "localhost:5173",
        }),
        response,
        next,
      ),
    );

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid doGet result from Runtime.",
      }),
    );
    expect(end).not.toHaveBeenCalled();
  });

  test("reject invalid doPost Runtime result", async () => {
    const { response, end } = createResponse();
    const next = vi.fn();
    const handler = createHostHttpHandler({
      server: createServer().server,
      builds: { waitForIdle: async () => undefined },
      contentResponses: { issue: () => "content-1" },
      sessions: { issue: () => "session-1" },
      runtime: {
        execute: async () => ({
          kind: "html",
          output: {
            content: "<main>posted</main>",
          },
        }),
      },
      userContentPort: 62000,
    });
    const request = createRequest(
      "POST",
      "/exec",
      {
        host: "localhost:5173",
        "content-type": "text/plain",
      },
      "hello",
    );

    await Promise.resolve(handler(request, response, next));

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid doPost result from Runtime.",
      }),
    );
    expect(end).not.toHaveBeenCalled();
  });

  test("redirect TextOutput to a one-time user-content URL", async () => {
    const { response, headers, end } = createResponse();
    const next = vi.fn();
    const issue = vi.fn(() => "content-1");
    const output = {
      content: "Vegas",
      fileName: null,
      mimeType: "TEXT",
    } as const;
    const handler = createHostHttpHandler({
      server: createServer().server,
      builds: { waitForIdle: async () => undefined },
      contentResponses: { issue },
      sessions: { issue: () => "session-1" },
      runtime: {
        execute: async () => ({
          kind: "text",
          output,
        }),
      },
      userContentPort: 62000,
    });

    await Promise.resolve(
      handler(
        createRequest("GET", "/dev", {
          host: "localhost:5173",
        }),
        response,
        next,
      ),
    );

    expect(issue).toHaveBeenCalledOnce();
    expect(issue).toHaveBeenCalledWith(output);
    expect(response.statusCode).toBe(302);
    expect(headers.get("Location")).toBe("http://localhost:62000/__vegas/content/content-1");
    expect(end).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });

  test("reject invalid TextOutput Runtime result", async () => {
    const { response, end } = createResponse();
    const next = vi.fn();
    const issue = vi.fn();
    const handler = createHostHttpHandler({
      server: createServer().server,
      builds: { waitForIdle: async () => undefined },
      contentResponses: { issue },
      sessions: { issue: () => "session-1" },
      runtime: {
        execute: async () => ({
          kind: "text",
          output: {
            content: "Vegas",
            fileName: null,
            mimeType: "UNKNOWN",
          },
        }),
      },
      userContentPort: 62000,
    });

    await Promise.resolve(
      handler(
        createRequest("GET", "/dev", {
          host: "localhost:5173",
        }),
        response,
        next,
      ),
    );

    expect(issue).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid doGet result from Runtime.",
      }),
    );
    expect(end).not.toHaveBeenCalled();
  });

  test("abort doGet execution when the client disconnects", async () => {
    const { response, end } = createResponse();
    const next = vi.fn();
    let executionSignal: AbortSignal | undefined;

    const execute = vi.fn(
      (request) =>
        new Promise<never>((_resolve, reject) => {
          executionSignal = request.signal;

          request.signal?.addEventListener(
            "abort",
            () => {
              reject(request.signal?.reason);
            },
            { once: true },
          );
        }),
    );

    const handler = createHostHttpHandler({
      server: createServer().server,
      builds: { waitForIdle: async () => undefined },
      contentResponses: { issue: () => "content-1" },
      sessions: { issue: () => "session-1" },
      runtime: { execute },
      userContentPort: 62000,
    });

    const handling = Promise.resolve(
      handler(
        createRequest("GET", "/dev", {
          host: "localhost:5173",
        }),
        response,
        next,
      ),
    );

    await vi.waitFor(() => {
      expect(execute).toHaveBeenCalledOnce();
    });

    response.emit("close");
    await handling;

    expect(executionSignal?.aborted).toBe(true);
    expect(executionSignal?.reason).toEqual(new Error("Vegas HTTP client disconnected."));
    expect(end).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test("do not start Runtime execution after the client disconnects while builds are pending", async () => {
    const { response, end } = createResponse();
    const execute = vi.fn();
    let releaseBuild: (() => void) | undefined;
    const waitForIdle = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseBuild = resolve;
        }),
    );

    const handler = createHostHttpHandler({
      server: createServer().server,
      builds: { waitForIdle },
      contentResponses: { issue: () => "content-1" },
      sessions: { issue: () => "session-1" },
      runtime: { execute },
      userContentPort: 62000,
    });

    const handling = Promise.resolve(
      handler(
        createRequest("GET", "/dev", {
          host: "localhost:5173",
        }),
        response,
        vi.fn(),
      ),
    );

    await vi.waitFor(() => {
      expect(waitForIdle).toHaveBeenCalledOnce();
    });

    response.emit("close");
    releaseBuild?.();
    await handling;

    expect(execute).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
  });
});
