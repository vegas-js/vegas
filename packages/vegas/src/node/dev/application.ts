import path from "node:path";

import { type Connect, type ViteBuilder, createLogger, createServer } from "vite";

import type { ServerFunctionCallRequest } from "../../shared/webapp-protocol";
import { type ArtifactStore, buildApp } from "../build";
import type { ResolvedProject } from "../project";
import type { Executor, InvocationEnvironment, InvocationScope } from "../runtime";
import { BuildCoordinator } from "./build-coordinator";
import { buildDevTopology } from "./build-topology";
import { classifyProjectFile } from "./project-file";
import { createRuntimeProgram } from "./runtime-program";
import { createAppsScriptDoGetEvent, createAppsScriptDoPostEvent } from "./webapp/event";
import { createHostHtml, type AppsScriptDoGetResult } from "./webapp/host-html";
import {
  createAppsScriptDoPostHttpResponse,
  parseWebAppPath,
  readRequestBody,
  resolveAppsScriptXFrameOptionsHeader,
  type AppsScriptDoPostResult,
} from "./webapp/http";
import { executeServerFunctionCall } from "./webapp/server-function-call";
import { WebAppSessionRegistry } from "./webapp/session-registry";
import { createBlankUserContentHtml, createUserContentPanelHtml } from "./webapp/user-content-html";

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
  #builder: ViteBuilder;

  constructor(options: DevApplicationOptions) {
    this.#project = options.project;
    this.#artifacts = options.artifacts;
    this.#executor = options.executor;
    this.#environment = options.environment;
    this.#scope = options.scope;
    this.#mode = options.mode;
    this.#builder = options.builder;
  }

  async #refreshBuildTopology(): Promise<void> {
    const next = await buildDevTopology(this.#project, this.#mode);

    this.#artifacts.replaceScopes([
      {
        scope: "client",
        artifacts: next.clientArtifacts,
      },
      {
        scope: "server",
        artifacts: next.serverArtifacts,
      },
    ]);

    this.#builder = next.builder;
  }

  async start(): Promise<void> {
    const sessions = new WebAppSessionRegistry();
    const builds = new BuildCoordinator();

    const hostServer = await createServer({
      root: this.#project.root,
      mode: this.#mode,
      configFile: false,
      customLogger: createLogger("info", { prefix: "[vegas]" }),
      cacheDir: path.join(this.#project.root, "node_modules", ".vegas-host"),
      plugins: [
        {
          name: "vite-plugin-configfile",
          configureServer(server) {
            Object.assign(server.config, { configFile: "vegas.config.ts" });
          },
        },
      ],
      server: {
        open: false,
      },
    });

    hostServer.watcher.add([this.#project.clientDir, this.#project.serverDir]);

    hostServer.watcher.on("change", async (filePath) => {
      const scope = classifyProjectFile(this.#project, filePath);

      if (!scope) {
        return;
      }

      try {
        await builds.run(async () => {
          if (scope === "client") {
            const [clientArtifacts, serverArtifacts] = await Promise.all([
              buildApp(this.#builder, /^client\d+$/),
              buildApp(this.#builder, /^server$/),
            ]);

            this.#artifacts.replaceScopes([
              {
                scope: "client",
                artifacts: clientArtifacts,
              },
              {
                scope: "server",
                artifacts: serverArtifacts,
              },
            ]);

            hostServer.moduleGraph.invalidateAll();

            hostServer.ws.send({ type: "full-reload" });

            return;
          }

          const artifacts = await buildApp(this.#builder, /^server$/);
          this.#artifacts.replaceScope("server", artifacts);
        });
      } catch (err: any) {
        console.error(err);

        hostServer.ws.send({
          type: "error",
          err: {
            // oxlint-disable-next-line no-control-regex
            message: err.message.replace(/\x1b\[[\d;]+m/g, ""),
            // oxlint-disable-next-line no-control-regex
            stack: err.stack.replace(/\x1b\[[\d;]+m/g, ""),
          },
        });
      }
    });

    const handleTopologyChange = async (filePath: string): Promise<void> => {
      const scope = classifyProjectFile(this.#project, filePath);
      if (!scope) {
        return;
      }

      try {
        await builds.run(async () => {
          await this.#refreshBuildTopology();

          hostServer.moduleGraph.invalidateAll();
          hostServer.ws.send({ type: "full-reload" });
        });
      } catch (err: any) {
        console.error(err);

        hostServer.ws.send({
          type: "error",
          err: {
            // oxlint-disable-next-line no-control-regex
            message: err.message.replace(/\x1b\[[\d;]+m/g, ""),
            // oxlint-disable-next-line no-control-regex
            stack: err.stack.replace(/\x1b\[[\d;]+m/g, ""),
          },
        });
      }
    };

    hostServer.watcher.on("add", handleTopologyChange);
    hostServer.watcher.on("unlink", handleTopologyChange);

    hostServer.ws.on("vegas:init", async (data, client) => {
      await builds.waitForIdle();

      if (sessions.consume(data.payload.id)) {
        client.send("vegas:init");
      } else {
        client.close();
      }
    });

    hostServer.ws.on(
      "vegas:server-function-call",
      async (data: ServerFunctionCallRequest, client) => {
        await builds.waitForIdle();

        const program = createRuntimeProgram(this.#artifacts);

        const response = await executeServerFunctionCall(
          this.#executor,
          data,
          program,
          this.#environment,
          this.#scope,
        );

        client.send("vegas:return", response);
      },
    );

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

    const userContentServer = await createServer({
      root: this.#project.root,
      mode: this.#mode,
      configFile: false,
      plugins: [
        {
          name: "vegas",

          resolveId(source, _importer, _options) {
            if (source === "/@vegas/client") {
              return "\0virtual:vegas";
            }
          },

          async load(id, _options) {
            if (id === "\0virtual:vegas") {
              return await this.fs.readFile(path.join(import.meta.dirname, "webapp-bridge.js"), {
                encoding: "utf8",
              });
            }
          },
        },
      ],
      server: { port: hostServer.config.server.port + 1 },
      customLogger: createLogger("info", { prefix: "[vegas]" }),
      cacheDir: path.join(this.#project.root, "node_modules", ".vegas-content"),
    });

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
