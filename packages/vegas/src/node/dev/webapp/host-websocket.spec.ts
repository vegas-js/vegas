import type { ViteDevServer } from "vite";
import { describe, expect, test, vi } from "vitest";

import { registerHostWebSocketHandlers } from "./host-websocket";

type WebSocketHandler = (data: any, client: any) => Promise<void> | void;

function createServer() {
  const handlers = new Map<string, WebSocketHandler>();

  return {
    server: {
      ws: {
        on: vi.fn((event: string, handler: WebSocketHandler) => {
          handlers.set(event, handler);
        }),
      },
    } as unknown as ViteDevServer,
    handlers,
  };
}

describe("registerHostWebSocketHandlers", () => {
  test("initialize a claimed session after builds become idle", async () => {
    const { server, handlers } = createServer();
    const waitForIdle = vi.fn(async () => undefined);
    const consume = vi.fn(() => true);
    const send = vi.fn();
    const close = vi.fn();

    registerHostWebSocketHandlers({
      server,
      builds: { waitForIdle },
      sessions: { consume },
      runtime: { execute: async () => undefined },
    });

    await handlers.get("vegas:init")?.({ payload: { id: "session-1" } }, { send, close });

    expect(waitForIdle).toHaveBeenCalledOnce();
    expect(consume).toHaveBeenCalledWith("session-1");
    expect(send).toHaveBeenCalledWith("vegas:init");
    expect(close).not.toHaveBeenCalled();
  });

  test("close the client when session initialization is rejected", async () => {
    const { server, handlers } = createServer();
    const send = vi.fn();
    const close = vi.fn();

    registerHostWebSocketHandlers({
      server,
      builds: { waitForIdle: async () => undefined },
      sessions: { consume: () => false },
      runtime: { execute: async () => undefined },
    });

    await handlers.get("vegas:init")?.({ payload: { id: "session-1" } }, { send, close });

    expect(send).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  test("execute a server function through the Runtime backend", async () => {
    const { server, handlers } = createServer();
    const send = vi.fn();
    const execute = vi.fn(async (request) => {
      expect(request).toStrictEqual({
        functionName: "hello",
        args: [],
      });
      return "result";
    });

    registerHostWebSocketHandlers({
      server,
      builds: { waitForIdle: async () => undefined },
      sessions: { consume: () => true },
      runtime: { execute },
    });

    await handlers.get("vegas:server-function-call")?.(
      {
        requestId: 1,
        functionName: "hello",
        args: [],
      },
      { send },
    );

    expect(send).toHaveBeenCalledWith("vegas:return", {
      requestId: 1,
      status: "ok",
      result: "result",
    });
  });
});
