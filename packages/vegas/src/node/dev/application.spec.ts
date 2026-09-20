import path from "node:path";

import type { InlineConfig, ViteBuilder, ViteDevServer } from "vite";
import { describe, expect, test, vi } from "vitest";

import { ArtifactStore } from "../build";
import type { ResolvedProject } from "../project";
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

function createServer(options: { port: number; listenError?: Error }) {
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
  test("close created servers when user content startup fails", async () => {
    const error = new Error("user content listen failed");
    const host = createServer({ port: 5173 });
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
