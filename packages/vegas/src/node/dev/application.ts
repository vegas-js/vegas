import path from "node:path";

import { type Connect, type ViteBuilder, createServer } from "vite";

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
import { createBlankUserContentHtml, createUserContentPanelHtml } from "./webapp/user-content-html";
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

export class DevApplication {
  readonly #project: ResolvedProject;
  readonly #artifacts: ArtifactStore;
  readonly #executor: Executor;
  readonly #environment: InvocationEnvironment;
  readonly #scope: InvocationScope;
  readonly #mode: "development" | "production";
  readonly #buildManager: DevBuildManager;

  constructor(options: DevApplicationOptions) {
    this.#project = options.project;
    this.#artifacts = options.artifacts;
    this.#executor = options.executor;
    this.#environment = options.environment;
    this.#scope = options.scope;
    this.#mode = options.mode;
    this.#buildManager = new DevBuildManager({
      project: options.project,
      artifacts: options.artifacts,
      builder: options.builder,
      mode: options.mode,
    });
  }

  async start(): Promise<void> {
    const sessions = new WebAppSessionRegistry();
    const builds = new BuildCoordinator();

    const hostServer = await createServer(
      createHostServerConfig({
        root: this.#project.root,
        mode: this.#mode,
      }),
    );

    registerBuildWatchers({
      server: hostServer,
      project: this.#project,
      builds,
      buildManager: this.#buildManager,
    });

    registerHostWebSocketHandlers({
      server: hostServer,
      builds,
      sessions,
      artifacts: this.#artifacts,
      executor: this.#executor,
      environment: this.#environment,
      scope: this.#scope,
    });

    const hostHandler = createHostHttpHandler({
      server: hostServer,
      builds,
      sessions,
      artifacts: this.#artifacts,
      executor: this.#executor,
      environment: this.#environment,
      scope: this.#scope,
    });

    hostServer.middlewares.stack.unshift({ route: "", handle: hostHandler });

    await hostServer.listen();

    const userContentServer = await createServer(
      createUserContentServerConfig({
        root: this.#project.root,
        mode: this.#mode,
        port: hostServer.config.server.port + 1,
        bridgeFilePath: path.join(import.meta.dirname, "webapp-bridge.js"),
      }),
    );

    const userContentHandler: Connect.NextHandleFunction = async (request, response, next) => {
      await builds.waitForIdle();

      if (request.url) {
        const scheme = userContentServer.config.server.https ? "https" : "http";
        const url = new URL(request.url, `${scheme}://${request.headers.host}`);
        if (url.pathname === "/blank") {
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(createBlankUserContentHtml());
          return;
        } else if (url.pathname === "/userCodeAppPanel") {
          const requestedSessionId = url.searchParams.get("sessionId");
          const sessionId =
            requestedSessionId && sessions.claim(requestedSessionId) ? requestedSessionId : "";

          const hostOrigin = `${url.protocol}//${url.hostname}:${hostServer.config.server.port}`;

          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(createUserContentPanelHtml(hostOrigin, sessionId));
          return;
        }
      }
      next();
    };

    userContentServer.middlewares.stack.unshift({ route: "", handle: userContentHandler });

    await userContentServer.listen();

    hostServer.printUrls();
    hostServer.bindCLIShortcuts({ print: true });
  }
}
