import { Readable } from "node:stream";

import type { ViteDevServer } from "vite";
import { describe, expect, test, vi } from "vitest";

import { createHostHttpHandler } from "./host-http-handler";

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

  return {
    response: {
      statusCode: 0,
      setHeader: vi.fn((name: string, value: string) => {
        headers.set(name, value);
      }),
      end: vi.fn((value?: unknown) => {
        body = value;
      }),
    },
    headers,
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
      sessions: { issue: () => "session-1" },
      runtime: { execute: async () => undefined },
      userContentPort: 62000,
    });

    await Promise.resolve(
      handler(
        {
          url: "/?name=alice",
          method: "GET",
          headers: { host: "localhost:5173" },
        } as any,
        response as any,
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
      expect(request).not.toHaveProperty("program");
      return {
        metaTags: [],
        title: "",
        faviconUrl: "",
        content: "<main>Hello</main>",
        xFrameOptionsMode: "DEFAULT",
      };
    });

    const handler = createHostHttpHandler({
      server,
      builds: { waitForIdle: async () => undefined },
      sessions: { issue: () => "session-1" },
      runtime: { execute },
      userContentPort: 62000,
    });

    await Promise.resolve(
      handler(
        {
          url: "/dev?name=alice",
          method: "GET",
          headers: {
            host: "localhost:5173",
            "user-agent": "Vegas Browser",
          },
        } as any,
        response as any,
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

  test("execute doPost and return the Apps Script response", async () => {
    const { response, headers, getBody } = createResponse();
    const execute = vi.fn(async (request) => {
      expect(request.functionName).toBe("doPost");
      expect(request.args[0].postData.contents).toBe("hello");
      expect(request.context).toStrictEqual({
        webApp: true,
        userAgent: "Vegas Browser",
      });
      expect(request).not.toHaveProperty("program");
      return {
        mimeType: "text/plain",
        content: "posted",
      };
    });

    const handler = createHostHttpHandler({
      server: createServer().server,
      builds: { waitForIdle: async () => undefined },
      sessions: { issue: () => "session-1" },
      runtime: { execute },
      userContentPort: 62000,
    });

    const request = Readable.from(["hello"]) as any;
    request.url = "/exec";
    request.method = "POST";
    request.headers = {
      host: "localhost:5173",
      "content-type": "text/plain",
      "user-agent": "Vegas Browser",
    };

    await Promise.resolve(handler(request, response as any, vi.fn()));

    expect(response.statusCode).toBe(200);
    expect(headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(getBody()).toBe("posted");
  });
});
