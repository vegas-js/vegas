import path from "node:path";

import { type Connect, type ViteBuilder, createLogger, createServer } from "vite";

import { type ArtifactStore, buildApp } from "../build";
import { HtmlDocument } from "../html";
import type { ResolvedProject } from "../project";
import type { GasExecutor } from "../runtime";
import { BuildCoordinator } from "./build-coordinator";
import { createGasDoGetEvent, createGasDoPostEvent } from "./webapp/event";
import { createHostHtml } from "./webapp/host-html";
import { WebAppSessionRegistry } from "./webapp/session-registry";

interface DevApplicationOptions {
  readonly project: ResolvedProject;
  readonly artifacts: ArtifactStore;
  readonly builder: ViteBuilder;
  readonly executor: GasExecutor;
  readonly mode: "development" | "production";
}

export class DevApplication {
  readonly #project: ResolvedProject;
  readonly #artifacts: ArtifactStore;
  readonly #builder: ViteBuilder;
  readonly #executor: GasExecutor;
  readonly #mode: "development" | "production";

  constructor(options: DevApplicationOptions) {
    this.#project = options.project;
    this.#artifacts = options.artifacts;
    this.#builder = options.builder;
    this.#executor = options.executor;
    this.#mode = options.mode;
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
      const isClientChange = filePath.startsWith(this.#project.clientDir);
      const isServerChange = filePath.startsWith(this.#project.serverDir);

      if (!isClientChange && !isServerChange) {
        return;
      }

      try {
        await builds.run(async () => {
          if (isClientChange) {
            const artifacts = await buildApp(this.#builder, /^client\d+$/);
            this.#artifacts.write(artifacts);

            hostServer.moduleGraph.invalidateAll();

            hostServer.ws.send({ type: "full-reload" });

            return;
          }

          const artifacts = await buildApp(this.#builder, /^server$/);
          this.#artifacts.write(artifacts);
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

    hostServer.ws.on("vegas:init", async (data, client) => {
      await builds.waitForIdle();

      if (sessions.consume(data.payload.id)) {
        client.send("vegas:init");
      } else {
        client.close();
      }
    });

    hostServer.ws.on("vegas:gascall", async (data, client) => {
      await builds.waitForIdle();

      try {
        const args = Array.isArray(data.args) ? data.args : [data.args];
        const result = await this.#executor.execute({
          functionName: data.func,
          args,
        });
        client.send("vegas:return", {
          requestId: data.requestId,
          status: "ok",
          result,
        });
      } catch (err: any) {
        hostServer.ws.send({
          type: "error",
          err: {
            requestId: data.requestId,
            message: err.message,
            stack: err.stack,
          },
        });
      }
    });

    const hostHandler: Connect.NextHandleFunction = async (request, response, next) => {
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
        } else if (/^\/(exec|dev)/.test(url.pathname)) {
          // response iframe
          if (request.method === "GET") {
            const doGetEvent = createGasDoGetEvent(url);

            sessions.issue();

            const result = await this.#executor.execute({
              functionName: "doGet",
              args: [doGetEvent],
            });

            const html = createHostHtml(url, result);
            const transFormedHtml = await hostServer.transformIndexHtml(url.href, html);
            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            if (result.xFrameOptionsMode) {
              response.setHeader("X-Frame-Options", result.xFrameOptionsMode);
            }
            response.end(transFormedHtml);
            return;
          } else if (request.method === "POST") {
            let data = "";
            request.on("data", (chunk) => (data += Buffer.from(chunk).toString("utf8")));
            request.on("end", async () => {
              const doPostEvent = createGasDoPostEvent(url, data, request.headers["content-type"]);

              const result = await this.#executor.execute({
                functionName: "doPost",
                args: [doPostEvent],
              });

              response.statusCode = 200;
              response.setHeader("Content-Type", `${result.mimeType}; charset=utf-8`);
              response.end(result);
            });
            return;
          }
        }
      }
      next();
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
              return await this.fs.readFile(path.join(import.meta.dirname, "client.js"), {
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
          const html = new HtmlDocument();
          html.appendToHead("meta", {
            attributes: {
              "http-equiv": "X-UA-Compatible",
              content: "IE=edge",
            },
          });
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(html.toString());
          return;
        } else if (url.pathname === "/userCodeAppPanel") {
          const html = new HtmlDocument();
          html.appendToHead("style", {
            text: "html, body, iframe {border: 0; display: block; height: 100%; margin: 0; padding: 0; width: 100%;}iframe#userHtmlFrame {overflow-y: scroll; -webkit-overflow-scrolling: touch;}",
          });

          const sessionId = sessions.claim() ?? "";

          const hostOrigin = `${url.protocol}//${url.hostname}:${hostServer.config.server.port}`;
          html.appendToHead("script", {
            text: `window.vegas = { id: "${sessionId}", hostOrigin: "${hostOrigin}", requestMap: new Map() }`,
          });
          html.appendToHead("script", {
            attributes: {
              type: "module",
              src: "/@vegas/client",
            },
          });

          html.appendToBody("iframe", {
            attributes: {
              id: "userHtmlFrame",
              allow:
                "accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *",
              src: "/blank",
            },
          });

          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(html.toString());
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
