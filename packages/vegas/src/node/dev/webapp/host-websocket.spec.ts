import type { ViteDevServer } from "vite";
import { describe, expect, test, vi } from "vitest";

import { ArtifactStore } from "../../build";
import type { InvocationEnvironment, InvocationScope } from "../../runtime";
import { registerHostWebSocketHandlers } from "./host-websocket";

type WebSocketHandler = (data: any, client: any) => Promise<void> | void;

const environment: InvocationEnvironment = {
  activeUserEmail: "",
  activeUserLocale: "en",
  effectiveUserEmail: "",
  scriptTimeZone: "UTC",
  temporaryActiveUserKey: "",
};

const scope: InvocationScope = {
  scriptKey: "/project",
  userKey: "local-user",
};

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

function createArtifacts() {
  const artifacts = new ArtifactStore();
  artifacts.replaceScope("server", [
    {
      path: "Code.js",
      content: "function hello() {}",
    },
  ]);
  return artifacts;
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
      artifacts: createArtifacts(),
      executor: { execute: async () => undefined },
      environment,
      scope,
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
      artifacts: createArtifacts(),
      executor: { execute: async () => undefined },
      environment,
      scope,
    });

    await handlers.get("vegas:init")?.({ payload: { id: "session-1" } }, { send, close });

    expect(send).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  test("execute a server function against the current artifacts", async () => {
    const { server, handlers } = createServer();
    const send = vi.fn();
    const execute = vi.fn(async (request) => {
      expect(request.program.source).toBe("function hello() {}");
      return "result";
    });

    registerHostWebSocketHandlers({
      server,
      builds: { waitForIdle: async () => undefined },
      sessions: { consume: () => true },
      artifacts: createArtifacts(),
      executor: { execute },
      environment,
      scope,
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
