import type { ViteDevServer } from "vite";
import { describe, expect, test, vi } from "vitest";

import { createUserContentHttpHandler } from "./user-content-http-handler";

function createServer() {
  return {
    config: {
      server: {
        https: false,
      },
    },
  } as unknown as ViteDevServer;
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

describe("createUserContentHttpHandler", () => {
  test("return the blank iframe document", async () => {
    const { response, headers, getBody } = createResponse();
    const waitForIdle = vi.fn(async () => undefined);
    const claim = vi.fn(() => false);
    const next = vi.fn();

    const handler = createUserContentHttpHandler({
      server: createServer(),
      builds: { waitForIdle },
      sessions: { claim },
      hostPort: 5173,
    });

    await handler(
      {
        url: "/blank",
        method: "GET",
        headers: { host: "localhost:5174" },
      } as any,
      response as any,
      next,
    );

    expect(waitForIdle).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
    expect(headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(String(getBody())).toContain('<meta http-equiv="X-UA-Compatible" content="IE=edge">');
    expect(claim).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test("return the user content panel for a claimed session", async () => {
    const { response, headers, getBody } = createResponse();
    const claim = vi.fn(() => true);

    const handler = createUserContentHttpHandler({
      server: createServer(),
      builds: { waitForIdle: async () => undefined },
      sessions: { claim },
      hostPort: 5173,
    });

    await handler(
      {
        url: "/userCodeAppPanel?sessionId=session-1",
        method: "GET",
        headers: { host: "localhost:5174" },
      } as any,
      response as any,
      vi.fn(),
    );

    expect(claim).toHaveBeenCalledWith("session-1");
    expect(response.statusCode).toBe(200);
    expect(headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(String(getBody())).toContain(
      'window.vegas = { id: "session-1", hostOrigin: "http://localhost:5173", requestMap: new Map() }',
    );
  });

  test("omit an unclaimed session from the user content panel", async () => {
    const { response, getBody } = createResponse();

    const handler = createUserContentHttpHandler({
      server: createServer(),
      builds: { waitForIdle: async () => undefined },
      sessions: { claim: () => false },
      hostPort: 5173,
    });

    await handler(
      {
        url: "/userCodeAppPanel?sessionId=session-1",
        method: "GET",
        headers: { host: "localhost:5174" },
      } as any,
      response as any,
      vi.fn(),
    );

    expect(String(getBody())).toContain(
      'window.vegas = { id: "", hostOrigin: "http://localhost:5173", requestMap: new Map() }',
    );
  });

  test("pass unrelated requests to the next middleware", async () => {
    const { response } = createResponse();
    const next = vi.fn();

    const handler = createUserContentHttpHandler({
      server: createServer(),
      builds: { waitForIdle: async () => undefined },
      sessions: { claim: () => false },
      hostPort: 5173,
    });

    await handler(
      {
        url: "/other",
        method: "GET",
        headers: { host: "localhost:5174" },
      } as any,
      response as any,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
  });
});
