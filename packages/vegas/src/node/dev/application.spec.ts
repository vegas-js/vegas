import path from "node:path";

import type { Connect, InlineConfig, ViteBuilder, ViteDevServer } from "vite";
import { describe, expect, test, vi } from "vitest";

import { ArtifactStore } from "../build";
import type { ResolvedProject } from "../project";
import { InMemorySpreadsheetStore } from "../runtime";
import { startDevApplication } from "./application";

const project = {
  root: path.resolve("project"),
  configFile: null,
  clientDir: path.resolve("project", "src", "client"),
  serverDir: path.resolve("project", "src", "server"),
  runtimeDataDir: path.resolve("project", "runtime"),
  outputDir: path.resolve("project", "dist"),
  appType: "spa",
  plugins: [],
  devServer: {
    host: "0.0.0.0",
    port: 61000,
    open: true,
  },
  appsScript: {
    manifest: {
      exceptionLogging: "STACKDRIVER",
      runtimeVersion: "V8",
      timeZone: "UTC",
      webapp: {
        access: "MYSELF",
        executeAs: "USER_ACCESSING",
      },
    },
  },
} satisfies ResolvedProject;

function createServer(options: { port: number; listeningPort?: number; listenError?: Error }) {
  const close = vi.fn(async () => undefined);
  const listen = vi.fn(async () => {
    if (options.listenError) {
      throw options.listenError;
    }

    return server;
  });
  const server = {
    config: {
      mode: "development",
      server: {
        port: options.port,
        https: false,
      },
    },
    watcher: {
      add: vi.fn(),
      on: vi.fn(),
    },
    ws: {
      on: vi.fn(),
    },
    middlewares: {
      stack: [],
    },
    httpServer: {
      address: () => ({
        address: "127.0.0.1",
        family: "IPv4",
        port: options.listeningPort ?? options.port,
      }),
    },
    transformIndexHtml: vi.fn(async (_url: string, html: string) => html),
    listen,
    close,
    printUrls: vi.fn(),
    bindCLIShortcuts: vi.fn(),
  } as unknown as ViteDevServer;

  return {
    server,
    close,
    listen,
  };
}

describe("startDevApplication", () => {
  test("wire servers using their actual listening ports", async () => {
    const host = createServer({ port: 5173, listeningPort: 62000 });
    const userContent = createServer({ port: 62001, listeningPort: 63000 });
    const createViteServer = vi
      .fn(async (_config?: InlineConfig) => host.server)
      .mockResolvedValueOnce(host.server)
      .mockResolvedValueOnce(userContent.server);
    const execute = vi.fn(async () => ({
      metaTags: [],
      title: "",
      faviconUrl: "",
      content: "<main>Hello</main>",
      xFrameOptionsMode: "DEFAULT",
    }));

    await startDevApplication(
      {
        project,
        artifacts: new ArtifactStore(),
        builder: {} as ViteBuilder,
        runtime: {
          execute,
          resources: {
            spreadsheets: new InMemorySpreadsheetStore([
              {
                id: "budget",
                name: "Budget",
                sheets: [],
              },
            ]),
          },
        },
        reloadRuntime: async () => undefined,
        mode: "development",
      },
      {
        createServer: createViteServer as typeof import("vite").createServer,
      },
    );

    const hostConfig = createViteServer.mock.calls[0]?.[0];
    expect(hostConfig?.server).toMatchObject({
      host: "0.0.0.0",
      port: 61000,
      open: true,
    });

    const userContentConfig = createViteServer.mock.calls[1]?.[0];
    expect(userContentConfig?.server).toMatchObject({
      host: "0.0.0.0",
      port: 62001,
    });

    const localSpreadsheetHandler = host.server.middlewares.stack[0]
      ?.handle as Connect.NextHandleFunction;
    const localSpreadsheetBody: unknown[] = [];
    await Promise.resolve(
      localSpreadsheetHandler?.(
        {
          url: "/__vegas/spreadsheets/budget",
          method: "GET",
          headers: {
            host: "localhost:62000",
          },
        } as any,
        {
          statusCode: 0,
          setHeader() {},
          end(value?: unknown) {
            localSpreadsheetBody.push(value);
          },
        } as any,
        (() => undefined) as any,
      ),
    );

    expect(JSON.parse(String(localSpreadsheetBody[0]))).toStrictEqual({
      id: "budget",
      name: "Budget",
      sheets: [],
    });

    const hostHandler = host.server.middlewares.stack[1]?.handle as Connect.NextHandleFunction;
    const hostBody: unknown[] = [];
    await Promise.resolve(
      hostHandler?.(
        {
          url: "/dev",
          method: "GET",
          headers: {
            host: "localhost:62000",
            "user-agent": "Vegas Browser",
          },
        } as any,
        {
          statusCode: 0,
          once: vi.fn(),
          off: vi.fn(),
          setHeader() {},
          end(value?: unknown) {
            hostBody.push(value);
          },
        } as any,
        (() => undefined) as any,
      ),
    );

    expect(String(hostBody[0])).toContain(
      'src="http://localhost:63000/userCodeAppPanel?sessionId=',
    );

    const userContentHandler = userContent.server.middlewares.stack[0]
      ?.handle as Connect.NextHandleFunction;
    const userContentBody: unknown[] = [];
    await Promise.resolve(
      userContentHandler?.(
        {
          url: "/userCodeAppPanel",
          method: "GET",
          headers: {
            host: "localhost:63000",
          },
        } as any,
        {
          statusCode: 0,
          setHeader() {},
          end(value?: unknown) {
            userContentBody.push(value);
          },
        } as any,
        (() => undefined) as any,
      ),
    );

    expect(String(userContentBody[0])).toContain('hostOrigin: "http://localhost:62000"');
  });

  test("close created servers when user content startup fails", async () => {
    const error = new Error("user content listen failed");
    const host = createServer({ port: 5173, listeningPort: 62000 });
    const userContent = createServer({
      port: 5174,
      listenError: error,
    });
    const createViteServer = vi
      .fn(async (_config?: InlineConfig) => host.server)
      .mockResolvedValueOnce(host.server)
      .mockResolvedValueOnce(userContent.server);

    await expect(
      startDevApplication(
        {
          project,
          artifacts: new ArtifactStore(),
          builder: {} as ViteBuilder,
          runtime: {
            execute: async () => undefined,
            resources: {
              spreadsheets: new InMemorySpreadsheetStore(),
            },
          },
          reloadRuntime: async () => undefined,
          mode: "development",
        },
        {
          createServer: createViteServer as typeof import("vite").createServer,
        },
      ),
    ).rejects.toBe(error);

    expect(host.listen).toHaveBeenCalledOnce();
    expect(userContent.listen).toHaveBeenCalledOnce();
    expect(userContent.close).toHaveBeenCalledOnce();
    expect(host.close).toHaveBeenCalledOnce();
  });
});
