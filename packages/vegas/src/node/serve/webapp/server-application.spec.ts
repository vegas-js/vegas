import type { ViteDevServer } from "vite";
import { describe, expect, test, vi } from "vitest";

import type { SpreadsheetStore } from "../../runtime";
import { startEphemeralWebAppApplication } from "./server-application";
import type { WebAppServerPair } from "./server-pair";

function createServer(options: { readonly websocketError?: Error } = {}) {
  const wsOn = vi.fn(() => {
    if (options.websocketError !== undefined) {
      throw options.websocketError;
    }
  });
  const middlewareStack: Array<{ route: string; handle: unknown }> = [];
  const server = {
    config: {
      mode: "development",
      server: {
        https: false,
      },
    },
    ws: {
      on: wsOn,
    },
    middlewares: {
      stack: middlewareStack,
    },
    transformIndexHtml: vi.fn(async (_url: string, html: string) => html),
  } as unknown as ViteDevServer;

  return {
    server,
    wsOn,
    middlewareStack,
  };
}

function createServerPair(options: { readonly websocketError?: Error } = {}) {
  const host = createServer({
    websocketError: options.websocketError,
  });
  const userContent = createServer();
  const dispose = vi.fn(async () => undefined);
  const pair = {
    host: {
      server: host.server,
      port: 62000,
      origin: "http://127.0.0.1:62000",
    },
    userContent: {
      server: userContent.server,
      port: 63000,
      origin: "http://127.0.0.1:63000",
    },
    dispose,
  } satisfies WebAppServerPair;

  return {
    pair,
    host,
    userContent,
    dispose,
  };
}

describe("startEphemeralWebAppApplication", () => {
  test("wire Runtime, cross-origin handlers, and local Spreadsheet support", async () => {
    const { pair, host, userContent } = createServerPair();
    const startServerPair = vi.fn(async () => pair);
    const setOrigin = vi.fn();
    const spreadsheetStore = {} as SpreadsheetStore;

    const application = await startEphemeralWebAppApplication(
      {
        root: "/project",
        configFile: "/project/vegas.config.ts",
        runtime: {
          execute: async () => undefined,
        },
        getLocalSpreadsheetStore: () => spreadsheetStore,
        localSpreadsheetUrls: {
          setOrigin,
        },
        bridgeFilePath: "/dist/webapp-bridge.js",
      },
      {
        startServerPair,
      },
    );

    expect(application).toBe(pair);
    expect(startServerPair).toHaveBeenCalledWith({
      root: "/project",
      configFile: "/project/vegas.config.ts",
      mode: "development",
      bridgeFilePath: "/dist/webapp-bridge.js",
    });
    expect(setOrigin).toHaveBeenCalledOnce();
    expect(setOrigin).toHaveBeenCalledWith("http://127.0.0.1:62000");

    expect(host.wsOn).toHaveBeenCalledTimes(3);
    expect(host.middlewareStack).toHaveLength(2);
    expect(userContent.middlewareStack).toHaveLength(2);
  });

  test("dispose the server pair when protocol wiring fails", async () => {
    const error = new Error("websocket wiring failed");
    const { pair, dispose } = createServerPair({
      websocketError: error,
    });

    await expect(
      startEphemeralWebAppApplication(
        {
          root: "/project",
          configFile: null,
          runtime: {
            execute: async () => undefined,
          },
        },
        {
          startServerPair: async () => pair,
        },
      ),
    ).rejects.toBe(error);

    expect(dispose).toHaveBeenCalledOnce();
  });
});
