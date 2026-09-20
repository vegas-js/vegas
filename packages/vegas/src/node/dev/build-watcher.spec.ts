import path from "node:path";

import type { ViteDevServer } from "vite";
import { describe, expect, test, vi } from "vitest";

import type { ResolvedProject } from "../project";
import { BuildCoordinator } from "./build-coordinator";
import { registerBuildWatchers } from "./build-watcher";

type WatchEvent = "change" | "add" | "unlink";
type WatchHandler = (filePath: string) => Promise<void> | void;

const fsRoot = path.parse(process.cwd()).root;
const root = path.join(fsRoot, "home", "user", "project");

function createProject(): ResolvedProject {
  return {
    root,
    configFile: null,
    clientDir: path.join(root, "src", "client"),
    serverDir: path.join(root, "src", "server"),
    runtimeDataDir: path.join(root, "runtime"),
    outputDir: path.join(root, "dist"),
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
  };
}

function createServer() {
  const handlers = new Map<WatchEvent, WatchHandler>();
  const add = vi.fn();
  const invalidateAll = vi.fn();
  const send = vi.fn();

  const server = {
    watcher: {
      add,
      on: vi.fn((event: WatchEvent, handler: WatchHandler) => {
        handlers.set(event, handler);
      }),
    },
    moduleGraph: { invalidateAll },
    ws: { send },
  } as unknown as ViteDevServer;

  return { server, handlers, add, invalidateAll, send };
}

describe("registerBuildWatchers", () => {
  test("rebuild client changes and request a full reload", async () => {
    const project = createProject();
    const { server, handlers, add, invalidateAll, send } = createServer();
    const rebuild = vi.fn(async () => undefined);
    const refreshTopology = vi.fn(async () => undefined);

    registerBuildWatchers({
      server,
      project,
      builds: new BuildCoordinator(),
      buildManager: { rebuild, refreshTopology },
      reloadRuntime: vi.fn(async () => undefined),
    });

    expect(add).toHaveBeenCalledWith([
      project.clientDir,
      project.serverDir,
      project.runtimeDataDir,
    ]);

    await handlers.get("change")?.(path.join(project.clientDir, "main.ts"));

    expect(rebuild).toHaveBeenCalledWith("client");
    expect(invalidateAll).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith({ type: "full-reload" });
  });

  test("rebuild server changes without reloading the client", async () => {
    const project = createProject();
    const { server, handlers, invalidateAll, send } = createServer();
    const rebuild = vi.fn(async () => undefined);

    registerBuildWatchers({
      server,
      project,
      builds: new BuildCoordinator(),
      buildManager: {
        rebuild,
        refreshTopology: vi.fn(async () => undefined),
      },
      reloadRuntime: vi.fn(async () => undefined),
    });

    await handlers.get("change")?.(path.join(project.serverDir, "Code.ts"));

    expect(rebuild).toHaveBeenCalledWith("server");
    expect(invalidateAll).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  test.each(["add", "unlink"] as const)("refresh topology after %s", async (event) => {
    const project = createProject();
    const { server, handlers, invalidateAll, send } = createServer();
    const refreshTopology = vi.fn(async () => undefined);

    registerBuildWatchers({
      server,
      project,
      builds: new BuildCoordinator(),
      buildManager: {
        rebuild: vi.fn(async () => undefined),
        refreshTopology,
      },
      reloadRuntime: vi.fn(async () => undefined),
    });

    await handlers.get(event)?.(path.join(project.clientDir, "admin.ts"));

    expect(refreshTopology).toHaveBeenCalledOnce();
    expect(invalidateAll).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith({ type: "full-reload" });
  });

  test.each(["change", "add", "unlink"] as const)(
    "reload runtime data after %s without rebuilding or reloading the client",
    async (event) => {
      const project = createProject();
      const { server, handlers, invalidateAll, send } = createServer();
      const rebuild = vi.fn(async () => undefined);
      const refreshTopology = vi.fn(async () => undefined);
      const reloadRuntime = vi.fn(async () => undefined);

      registerBuildWatchers({
        server,
        project,
        builds: new BuildCoordinator(),
        buildManager: { rebuild, refreshTopology },
        reloadRuntime,
      });

      await handlers.get(event)?.(path.join(project.runtimeDataDir, "session.ts"));

      expect(reloadRuntime).toHaveBeenCalledOnce();
      expect(rebuild).not.toHaveBeenCalled();
      expect(refreshTopology).not.toHaveBeenCalled();
      expect(invalidateAll).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    },
  );

  test("report build errors without requiring a stack", async () => {
    const project = createProject();
    const { server, handlers, send } = createServer();
    const error = new Error("\x1b[31mbuild failed\x1b[0m");
    error.stack = undefined;
    const rebuild = vi.fn(async () => {
      throw error;
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      registerBuildWatchers({
        server,
        project,
        builds: new BuildCoordinator(),
        buildManager: {
          rebuild,
          refreshTopology: vi.fn(async () => undefined),
        },
        reloadRuntime: vi.fn(async () => undefined),
      });

      await handlers.get("change")?.(path.join(project.serverDir, "Code.ts"));

      expect(send).toHaveBeenCalledWith({
        type: "error",
        err: {
          message: "build failed",
          stack: "build failed",
        },
      });
    } finally {
      consoleError.mockRestore();
    }
  });

  test("report topology errors thrown as non-Error values", async () => {
    const project = createProject();
    const { server, handlers, invalidateAll, send } = createServer();
    const refreshTopology = vi.fn(async () => {
      throw "\x1b[31mtopology failed\x1b[0m";
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      registerBuildWatchers({
        server,
        project,
        builds: new BuildCoordinator(),
        buildManager: {
          rebuild: vi.fn(async () => undefined),
          refreshTopology,
        },
        reloadRuntime: vi.fn(async () => undefined),
      });

      await handlers.get("add")?.(path.join(project.clientDir, "admin.ts"));

      expect(invalidateAll).not.toHaveBeenCalled();
      expect(send).toHaveBeenCalledWith({
        type: "error",
        err: {
          message: "topology failed",
          stack: "topology failed",
        },
      });
    } finally {
      consoleError.mockRestore();
    }
  });
});
