import path from "node:path";

import { type Connect, type ViteBuilder, createServer } from "vite";

import type { ArtifactStore } from "../build";
import type { ResolvedProject } from "../project";
import type { Executor, InvocationEnvironment, InvocationScope } from "../runtime";
import { BuildCoordinator } from "./build-coordinator";
import { DevBuildManager } from "./build-manager";
import { registerBuildWatchers } from "./build-watcher";
import { createRuntimeProgram } from "./runtime-program";
import { createAppsScriptDoGetEvent, createAppsScriptDoPostEvent } from "./webapp/event";
import { createHostHtml, type AppsScriptDoGetResult } from "./webapp/host-html";
import { createHostServerConfig } from "./webapp/host-server";
import { registerHostWebSocketHandlers } from "./webapp/host-websocket";
import {
  createAppsScriptDoPostHttpResponse,
  parseWebAppPath,
  readRequestBody,
  resolveAppsScriptXFrameOptionsHeader,
  type AppsScriptDoPostResult,
} from "./webapp/http";
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

    const hostHandler: Connect.NextHandleFunction = async (request, response, next) => {
      try {
        await builds.waitForIdle();

        if (request.url) {
          const scheme = hostServer.config.server.https ? "https" : "http";
          const url = new URL(request.url, `${scheme}://${request.headers.host}`);
          url.port = String(Number.parseInt(url.port) + 1);
          if (url.pathname === "/") {
            // redirect to iframe
            const basePath = hostServer.config.mode === "production" ? "/exec" : "/dev";
            response.statusCode = 307;
            response.setHeader("Location", `${basePath}${url.search}`);
            response.end();
            return;
          } else if (parseWebAppPath(url.pathname)) {
            // response iframe
            if (request.method === "GET") {
              const doGetEvent = createAppsScriptDoGetEvent(url);

              const program = createRuntimeProgram(this.#artifacts);

              const result = (await this.#executor.execute({
                program,
                functionName: "doGet",
                args: [doGetEvent],
                environment: this.#environment,
                scope: this.#scope,
              })) as AppsScriptDoGetResult;

              const sessionId = sessions.issue();

              const html = createHostHtml(url, result, sessionId);
              const transFormedHtml = await hostServer.transformIndexHtml(url.href, html);

              response.statusCode = 200;
              response.setHeader("Content-Type", "text/html; charset=utf-8");

              const xFrameOptionsHeader = resolveAppsScriptXFrameOptionsHeader(
                result.xFrameOptionsMode,
              );
              if (xFrameOptionsHeader !== undefined) {
                response.setHeader("X-Frame-Options", xFrameOptionsHeader);
              }

              response.end(transFormedHtml);

              return;
            } else if (request.method === "POST") {
              const body = await readRequestBody(request);
              const doPostEvent = createAppsScriptDoPostEvent(
                url,
                body,
                request.headers["content-type"],
              );

              const program = createRuntimeProgram(this.#artifacts);

              const result = (await this.#executor.execute({
                program,
                functionName: "doPost",
                args: [doPostEvent],
                environment: this.#environment,
                scope: this.#scope,
              })) as AppsScriptDoPostResult;

              const httpResponse = createAppsScriptDoPostHttpResponse(result);

              response.statusCode = 200;
              response.setHeader("Content-Type", httpResponse.contentType);

              response.end(httpResponse.body);

              return;
            }
          }
        }

        next();
      } catch (error) {
        next(error);
      }
    };

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
