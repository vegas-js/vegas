import path from "node:path";

import { type ViteBuilder, type ViteDevServer, createServer } from "vite";

import type { ArtifactStore } from "../build";
import type { ResolvedProject } from "../project";
import type { RuntimeBackend } from "../runtime";
import { BuildCoordinator } from "./build-coordinator";
import { DevBuildManager } from "./build-manager";
import { registerBuildWatchers } from "./build-watcher";
import { createHostHttpHandler } from "./webapp/host-http-handler";
import { createHostServerConfig } from "./webapp/host-server";
import { registerHostWebSocketHandlers } from "./webapp/host-websocket";
import { getListeningPort } from "./webapp/server-port";
import { WebAppSessionRegistry } from "./webapp/session-registry";
import { createUserContentHttpHandler } from "./webapp/user-content-http-handler";
import { createUserContentServerConfig } from "./webapp/user-content-server";

interface DevApplicationOptions {
  readonly project: ResolvedProject;
  readonly artifacts: ArtifactStore;
  readonly builder: ViteBuilder;
  readonly runtime: RuntimeBackend;
  readonly reloadRuntime: () => Promise<void>;
  readonly mode: "development" | "production";
}

interface DevApplicationDependencies {
  readonly createServer?: typeof createServer;
}

async function closeServers(servers: readonly ViteDevServer[]): Promise<void> {
  for (const server of [...servers].reverse()) {
    try {
      await server.close();
    } catch {
      // Preserve the startup error that triggered cleanup.
    }
  }
}

export async function startDevApplication(
  options: DevApplicationOptions,
  dependencies: DevApplicationDependencies = {},
): Promise<void> {
  const createViteServer = dependencies.createServer ?? createServer;
  const servers: ViteDevServer[] = [];

  const buildManager = new DevBuildManager({
    project: options.project,
    artifacts: options.artifacts,
    builder: options.builder,
    mode: options.mode,
  });
  const sessions = new WebAppSessionRegistry();
  const builds = new BuildCoordinator();

  try {
    const hostServer = await createViteServer(
      createHostServerConfig({
        root: options.project.root,
        mode: options.mode,
        host: options.project.devServer.host,
        port: options.project.devServer.port,
        open: options.project.devServer.open,
      }),
    );
    servers.push(hostServer);

    registerBuildWatchers({
      server: hostServer,
      project: options.project,
      builds,
      buildManager,
      reloadRuntime: options.reloadRuntime,
    });

    registerHostWebSocketHandlers({
      server: hostServer,
      builds,
      sessions,
      runtime: options.runtime,
    });

    await hostServer.listen();
    const hostPort = getListeningPort(hostServer);

    const userContentServer = await createViteServer(
      createUserContentServerConfig({
        root: options.project.root,
        mode: options.mode,
        host: options.project.devServer.host,
        port: hostPort + 1,
        bridgeFilePath: path.join(import.meta.dirname, "webapp-bridge.js"),
      }),
    );
    servers.push(userContentServer);

    const userContentHandler = createUserContentHttpHandler({
      server: userContentServer,
      builds,
      sessions,
      hostPort,
    });

    userContentServer.middlewares.stack.unshift({ route: "", handle: userContentHandler });

    await userContentServer.listen();
    const userContentPort = getListeningPort(userContentServer);

    const hostHandler = createHostHttpHandler({
      server: hostServer,
      builds,
      sessions,
      runtime: options.runtime,
      userContentPort,
    });

    hostServer.middlewares.stack.unshift({ route: "", handle: hostHandler });

    hostServer.printUrls();
    hostServer.bindCLIShortcuts({ print: true });
  } catch (error) {
    await closeServers(servers);
    throw error;
  }
}
