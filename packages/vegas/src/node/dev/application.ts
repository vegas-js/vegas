import path from "node:path";

import type { ViteBuilder } from "vite";

import type { ArtifactStore } from "../build";
import type { ResolvedProject } from "../project";
import type { RuntimeBackend, SpreadsheetStore } from "../runtime";
import { BuildCoordinator } from "./build-coordinator";
import { DevBuildManager } from "./build-manager";
import { registerBuildWatchers } from "./build-watcher";
import { createContentResponseHttpHandler } from "./webapp/content-response-http-handler";
import { ContentResponseRegistry } from "./webapp/content-response-registry";
import { createHostHttpHandler } from "./webapp/host-http-handler";
import { createHostServerConfig } from "./webapp/host-server";
import { registerHostWebSocketHandlers } from "./webapp/host-websocket";
import { createLocalSpreadsheetHttpHandler } from "./webapp/local-spreadsheet-http-handler";
import type { LocalSpreadsheetUrlConfiguration } from "./webapp/local-spreadsheet-url";
import { WebAppServerLifecycle } from "./webapp/server-lifecycle";
import { getListeningPort } from "./webapp/server-port";
import { WebAppSessionRegistry } from "./webapp/session-registry";
import { createUserContentHttpHandler } from "./webapp/user-content-http-handler";
import { createUserContentServerConfig } from "./webapp/user-content-server";

interface DevApplicationOptions {
  readonly project: ResolvedProject;
  readonly artifacts: ArtifactStore;
  readonly builder: ViteBuilder;
  readonly runtime: RuntimeBackend;
  readonly getLocalSpreadsheetStore?: () => SpreadsheetStore;
  readonly reloadRuntime: () => Promise<void>;
  readonly localSpreadsheetUrls?: LocalSpreadsheetUrlConfiguration;
  readonly mode: "development" | "production";
}

interface DevApplicationDependencies {
  readonly createServer?: typeof import("vite").createServer;
}

export async function startDevApplication(
  options: DevApplicationOptions,
  dependencies: DevApplicationDependencies = {},
): Promise<void> {
  const servers = new WebAppServerLifecycle(dependencies.createServer);

  const buildManager = new DevBuildManager({
    project: options.project,
    artifacts: options.artifacts,
    builder: options.builder,
    mode: options.mode,
  });
  const sessions = new WebAppSessionRegistry();
  const contentResponses = new ContentResponseRegistry();
  const builds = new BuildCoordinator();

  try {
    const hostServer = await servers.create(
      createHostServerConfig({
        root: options.project.root,
        configFile: options.project.configFile,
        mode: options.mode,
        host: options.project.devServer.host,
        port: options.project.devServer.port,
        open: options.project.devServer.open,
      }),
    );

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

    if (options.localSpreadsheetUrls !== undefined) {
      const localUrl = hostServer.resolvedUrls?.local[0];
      const scheme = hostServer.config.server.https ? "https" : "http";
      options.localSpreadsheetUrls.setOrigin(
        localUrl === undefined ? `${scheme}://localhost:${hostPort}` : new URL(localUrl).origin,
      );
    }

    const userContentServer = await servers.create(
      createUserContentServerConfig({
        root: options.project.root,
        mode: options.mode,
        host: options.project.devServer.host,
        port: hostPort + 1,
        bridgeFilePath: path.join(import.meta.dirname, "webapp-bridge.js"),
      }),
    );

    const userContentHandler = createUserContentHttpHandler({
      server: userContentServer,
      builds,
      sessions,
      hostPort,
    });

    userContentServer.middlewares.stack.unshift({ route: "", handle: userContentHandler });

    const contentResponseHandler = createContentResponseHttpHandler({
      responses: contentResponses,
    });
    userContentServer.middlewares.stack.unshift({ route: "", handle: contentResponseHandler });

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

    if (options.getLocalSpreadsheetStore !== undefined) {
      const localSpreadsheetHandler = createLocalSpreadsheetHttpHandler({
        getSpreadsheetStore: options.getLocalSpreadsheetStore,
      });
      hostServer.middlewares.stack.unshift({ route: "", handle: localSpreadsheetHandler });
    }

    hostServer.printUrls();
    hostServer.bindCLIShortcuts({ print: true });
  } catch (error) {
    try {
      await servers.dispose();
    } catch {
      // Preserve the startup error that triggered cleanup.
    }

    throw error;
  }
}
