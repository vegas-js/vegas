import type { InlineConfig, ViteDevServer } from "vite";
import { describe, expect, test, vi } from "vitest";

import { startEphemeralWebAppServerPair } from "./server-pair";

function createServer(options: {
  readonly name: string;
  readonly listeningPort: number;
  readonly events: string[];
  readonly listenError?: Error;
}) {
  const close = vi.fn(async () => {
    options.events.push(`close:${options.name}`);
  });
  const listen = vi.fn(async () => {
    options.events.push(`listen:${options.name}`);

    if (options.listenError !== undefined) {
      throw options.listenError;
    }

    return server;
  });
  const server = {
    httpServer: {
      address: () => ({
        address: "127.0.0.1",
        family: "IPv4",
        port: options.listeningPort,
      }),
    },
    listen,
    close,
  } as unknown as ViteDevServer;

  return {
    server,
    close,
    listen,
  };
}

describe("startEphemeralWebAppServerPair", () => {
  test("listen on loopback ephemeral ports and expose actual origins", async () => {
    const events: string[] = [];
    const host = createServer({
      name: "host",
      listeningPort: 62000,
      events,
    });
    const userContent = createServer({
      name: "user-content",
      listeningPort: 63000,
      events,
    });
    const createViteServer = vi
      .fn(async (_config?: InlineConfig) => host.server)
      .mockResolvedValueOnce(host.server)
      .mockResolvedValueOnce(userContent.server);

    const pair = await startEphemeralWebAppServerPair(
      {
        root: "/project",
        configFile: "/project/vegas.config.ts",
        mode: "development",
        bridgeFilePath: "/dist/webapp-bridge.js",
      },
      {
        createServer: createViteServer as typeof import("vite").createServer,
      },
    );

    expect(createViteServer).toHaveBeenCalledTimes(2);

    const hostConfig = createViteServer.mock.calls[0]?.[0];
    expect(hostConfig).toMatchObject({
      root: "/project",
      mode: "development",
      server: {
        host: "127.0.0.1",
        port: 0,
        open: false,
      },
    });

    const userContentConfig = createViteServer.mock.calls[1]?.[0];
    expect(userContentConfig).toMatchObject({
      root: "/project",
      mode: "development",
      server: {
        host: "127.0.0.1",
        port: 0,
      },
    });

    expect(pair.host).toMatchObject({
      server: host.server,
      port: 62000,
      origin: "http://127.0.0.1:62000",
    });
    expect(pair.userContent).toMatchObject({
      server: userContent.server,
      port: 63000,
      origin: "http://127.0.0.1:63000",
    });
    expect(events).toStrictEqual(["listen:host", "listen:user-content"]);

    await pair.dispose();

    expect(events).toStrictEqual([
      "listen:host",
      "listen:user-content",
      "close:user-content",
      "close:host",
    ]);
    expect(host.close).toHaveBeenCalledOnce();
    expect(userContent.close).toHaveBeenCalledOnce();
  });

  test("dispose created servers when user content startup fails", async () => {
    const events: string[] = [];
    const error = new Error("user content listen failed");
    const host = createServer({
      name: "host",
      listeningPort: 62000,
      events,
    });
    const userContent = createServer({
      name: "user-content",
      listeningPort: 0,
      events,
      listenError: error,
    });
    const createViteServer = vi
      .fn(async (_config?: InlineConfig) => host.server)
      .mockResolvedValueOnce(host.server)
      .mockResolvedValueOnce(userContent.server);

    await expect(
      startEphemeralWebAppServerPair(
        {
          root: "/project",
          configFile: null,
          mode: "development",
        },
        {
          createServer: createViteServer as typeof import("vite").createServer,
        },
      ),
    ).rejects.toBe(error);

    expect(events).toStrictEqual([
      "listen:host",
      "listen:user-content",
      "close:user-content",
      "close:host",
    ]);
  });
});
