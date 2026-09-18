import path from "node:path";

import { type ViteBuilder, createServer } from "vite";

import type { ArtifactStore } from "../build";
import type { ResolvedProject } from "../project";
import type { Executor, InvocationEnvironment, InvocationScope } from "../runtime";
import { BuildCoordinator } from "./build-coordinator";
import { DevBuildManager } from "./build-manager";
import { registerBuildWatchers } from "./build-watcher";
import { createHostHttpHandler } from "./webapp/host-http-handler";
import { createHostServerConfig } from "./webapp/host-server";
import { registerHostWebSocketHandlers } from "./webapp/host-websocket";
import { WebAppSessionRegistry } from "./webapp/session-registry";
import { createUserContentHttpHandler } from "./webapp/user-content-http-handler";
import { createUserContentServerConfig } from "./webapp/user-content-server";

interface DevApplicationOptions {
  readonly project: ResolvedProject;
  readonly artifacts: ArtifactStore;
  readonly builder: ViteBuilder;
  readonly executor: Executor;
  readonly environment: InvocationEnvironment;
  readonly scope: InvocationScope;
  readonly mode: "development" | "production";
}

export async function startDevApplication(options: DevApplicationOptions): Promise<void> {
  const buildManager = new DevBuildManager({
    project: options.project,
    artifacts: options.artifacts,
    builder: options.builder,
    mode: options.mode,
  });
  const sessions = new WebAppSessionRegistry();
  const builds = new BuildCoordinator();

  const hostServer = await createServer(
    createHostServerConfig({
      root: options.project.root,
      mode: options.mode,
    }),
  );

  registerBuildWatchers({
    server: hostServer,
    project: options.project,
    builds,
    buildManager,
  });

  registerHostWebSocketHandlers({
    server: hostServer,
    builds,
    sessions,
    artifacts: options.artifacts,
    executor: options.executor,
    environment: options.environment,
    scope: options.scope,
  });

  const hostHandler = createHostHttpHandler({
    server: hostServer,
    builds,
    sessions,
    artifacts: options.artifacts,
    executor: options.executor,
    environment: options.environment,
    scope: options.scope,
  });

  hostServer.middlewares.stack.unshift({ route: "", handle: hostHandler });

  await hostServer.listen();

  const userContentServer = await createServer(
    createUserContentServerConfig({
      root: options.project.root,
      mode: options.mode,
      port: hostServer.config.server.port + 1,
      bridgeFilePath: path.join(import.meta.dirname, "webapp-bridge.js"),
    }),
  );

  const userContentHandler = createUserContentHttpHandler({
    server: userContentServer,
    builds,
    sessions,
    hostPort: hostServer.config.server.port,
  });

  userContentServer.middlewares.stack.unshift({ route: "", handle: userContentHandler });

  await userContentServer.listen();

  hostServer.printUrls();
  hostServer.bindCLIShortcuts({ print: true });
}
