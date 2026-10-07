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

  test("close the client when session initialization fails", async () => {
    const { server, handlers } = createServer();
    const error = new Error("build failed");
    const consume = vi.fn();
    const send = vi.fn();
    const close = vi.fn();

    registerHostWebSocketHandlers({
      server,
      builds: {
        waitForIdle: async () => {
          throw error;
        },
      },
      sessions: { consume },
      runtime: { execute: async () => undefined },
    });

    await handlers.get("vegas:init")?.({ payload: { id: "session-1" } }, { send, close });

    expect(consume).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
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

  test("return a failed server function response when builds fail", async () => {
    const { server, handlers } = createServer();
    const error = new Error("build failed");
    const send = vi.fn();
    const close = vi.fn();
    const execute = vi.fn();

    registerHostWebSocketHandlers({
      server,
      builds: {
        waitForIdle: async () => {
          throw error;
        },
      },
      sessions: { consume: () => true },
      runtime: { execute },
    });

    await handlers.get("vegas:server-function-call")?.(
      {
        requestId: 1,
        functionName: "hello",
        args: [],
      },
      { send, close },
    );

    expect(execute).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith("vegas:return", {
      requestId: 1,
      status: "err",
      message: "build failed",
    });
    expect(close).not.toHaveBeenCalled();
  });

  test("close the client when a failed server function response cannot be sent", async () => {
    const { server, handlers } = createServer();
    const send = vi.fn(() => {
      throw new Error("send failed");
    });
    const close = vi.fn();

    registerHostWebSocketHandlers({
      server,
      builds: {
        waitForIdle: async () => {
          throw new Error("build failed");
        },
      },
      sessions: { consume: () => true },
      runtime: { execute: vi.fn() },
    });

    await handlers.get("vegas:server-function-call")?.(
      {
        requestId: 1,
        functionName: "hello",
        args: [],
      },
      { send, close },
    );

    expect(send).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  test("close the client without sending a second response when success delivery fails", async () => {
    const { server, handlers } = createServer();
    const send = vi.fn(() => {
      throw new Error("send failed");
    });
    const close = vi.fn();
    const execute = vi.fn(async () => "result");

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
      { send, close },
    );

    expect(execute).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith("vegas:return", {
      requestId: 1,
      status: "ok",
      result: "result",
    });
    expect(close).toHaveBeenCalledOnce();
  });

  test("execute a server function through the Runtime backend", async () => {
    const { server, handlers } = createServer();
    const send = vi.fn();
    const execute = vi.fn(async (request) => {
      expect(request.functionName).toBe("hello");
      expect(request.args).toStrictEqual([]);
      expect(request.signal).toBeInstanceOf(AbortSignal);
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
      { send, close: vi.fn() },
    );

    expect(send).toHaveBeenCalledWith("vegas:return", {
      requestId: 1,
      status: "ok",
      result: "result",
    });
  });

  test("abort active server function calls when their client disconnects", async () => {
    const { server, handlers } = createServer();
    const send = vi.fn();
    const close = vi.fn();
    const client = { send, close };
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

    registerHostWebSocketHandlers({
      server,
      builds: { waitForIdle: async () => undefined },
      sessions: { consume: () => true },
      runtime: { execute },
    });

    const call = handlers.get("vegas:server-function-call")?.(
      {
        requestId: 1,
        functionName: "hello",
        args: [],
      },
      client,
    );

    await vi.waitFor(() => {
      expect(execute).toHaveBeenCalledOnce();
    });

    await handlers.get("vite:client:disconnect")?.(undefined, client);
    await call;

    expect(executionSignal?.aborted).toBe(true);
    expect(executionSignal?.reason).toEqual(new Error("Vegas RPC client disconnected."));
    expect(send).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  test("disconnect only aborts executions owned by that client", async () => {
    const { server, handlers } = createServer();
    const firstClient = { send: vi.fn(), close: vi.fn() };
    const secondClient = { send: vi.fn(), close: vi.fn() };
    const signals: AbortSignal[] = [];

    const execute = vi.fn((request) => {
      signals.push(request.signal);

      return new Promise<never>((_resolve, reject) => {
        request.signal?.addEventListener(
          "abort",
          () => {
            reject(request.signal?.reason);
          },
          { once: true },
        );
      });
    });

    registerHostWebSocketHandlers({
      server,
      builds: { waitForIdle: async () => undefined },
      sessions: { consume: () => true },
      runtime: { execute },
    });

    const firstCall = handlers.get("vegas:server-function-call")?.(
      { requestId: 1, functionName: "first", args: [] },
      firstClient,
    );
    const secondCall = handlers.get("vegas:server-function-call")?.(
      { requestId: 2, functionName: "second", args: [] },
      secondClient,
    );

    await vi.waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(2);
    });

    await handlers.get("vite:client:disconnect")?.(undefined, firstClient);
    await firstCall;

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    await handlers.get("vite:client:disconnect")?.(undefined, secondClient);
    await secondCall;
  });
});
