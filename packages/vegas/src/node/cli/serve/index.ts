import crypto from "node:crypto";
import path from "node:path";

import { Connect, createBuilder, createLogger, createServer, ViteBuilder } from "vite";

import { buildApp, createBuilderConfig, extractOutput } from "../build";
import { HTML } from "../core";
import { collectSources, detectClientEntries } from "../core/analyze";
import { loadConfig, resolveConfig } from "../core/config";
import { createServeContext, ServeContext } from "./context";
import { createHostHtml } from "./hostHtml";
import { launchGAS } from "./launch";
import { loadMock } from "./mock";

async function serveApp(ctx: ServeContext, builder: ViteBuilder) {
  const idMap: Map<string, { use: boolean; expiredAt: number }> = new Map();
  const hostServer = await createServer({
    root: ctx.config.root,
    configFile: false,
    customLogger: createLogger("info", { prefix: "[vegas]" }),
    cacheDir: path.join(ctx.config.root, "node_modules", ".vegas-host"),
  });

  hostServer.watcher.add([ctx.config.clientDir, ctx.config.serverDir]);

  hostServer.watcher.on("change", async (path) => {
    if (path.startsWith(ctx.config.clientDir)) {
      const result = await buildApp(builder, /^client\d+$/);
      const output = extractOutput(result);
      ctx.code.client.map = output.client;
      hostServer.moduleGraph.invalidateAll();
      hostServer.ws.send({ type: "full-reload" });
      return [];
    } else if (path.startsWith(ctx.config.serverDir)) {
      const result = await buildApp(builder, /^gas$/);
      const output = extractOutput(result);
      ctx.code.server = output.server;
      return [];
    }
  });

  hostServer.ws.on("vegas:init", (data, client) => {
    idMap.forEach((value, key, map) => {
      if (value.expiredAt <= Date.now()) {
        map.delete(key);
      }
    });
    const value = idMap.get(data.payload.id);
    if (value && value.use) {
      idMap.delete(data.payload.id);
      client.send("vegas:init");
    } else {
      client.close();
    }
  });

  hostServer.ws.on("vegas:gascall", async (data, client) => {
    try {
      const args = Array.isArray(data.args) ? data.args : [data.args];
      const result = await launchGAS(ctx, data.func, ...args);
      client.send("vegas:return", {
        id: data.id,
        status: "ok",
        result,
      });
    } catch (error) {
      client.send("vegas:return", {
        id: data.id,
        status: "err",
        message: (error as any).message,
      });
    }
  });

  const hostHandler: Connect.NextHandleFunction = async (request, response, next) => {
    if (request.url) {
      const scheme = userContentServer.config.server.https ? "https" : "http";
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
        const queryString = url.search.length > 1 ? url.search.slice(1) : "";
        const { parameter, parameters } = ((queryString) => {
          const parameter: Record<string, string> = {};
          const parameters: Record<string, string[]> = {};

          queryString.split("&").forEach((query) => {
            const [key, value] = query.split("=");
            if (key) {
              if (!parameter[key]) {
                parameter[key] = value ?? "";
              }
              parameters[key] ??= [];
              parameters[key].push(value ?? "");
            }
          });

          return { parameter, parameters };
        })(queryString);

        const doGetEvent: Record<string, any> = {
          queryString,
          parameter,
          parameters,
          contextPath: "",
          contentLength: -1,
        };
        const pathInfo = (() => {
          const temp = url.pathname.replace(/^\/(exec|dev)/, "");
          return temp.length !== 0 ? temp.slice(1) : (undefined as unknown as string);
        })();
        if (pathInfo) {
          doGetEvent["pathInfo"] = pathInfo;
        }
        if (!ctx.code.client.hrefs.includes(url.href)) {
          ctx.code.client.hrefs.push(url.href);
        }
        let uuid = "";
        do {
          uuid = crypto.randomUUID();
        } while (idMap.has(uuid));
        idMap.set(uuid, { use: false, expiredAt: Date.now() + 1000 * 30 });
        const result = await launchGAS(ctx, "doGet", doGetEvent);
        const html = createHostHtml(url, result);
        const transFormedHtml = await hostServer.transformIndexHtml(url.href, html);
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html");
        if (result.xFrameOptionsMode) {
          response.setHeader("X-Frame-Options", result.xFrameOptionsMode);
        }
        response.end(transFormedHtml);
        return;
      }
    }
    next();
  };

  hostServer.middlewares.stack.unshift({ route: "", handle: hostHandler });

  await hostServer.listen();

  const userContentServer = await createServer({
    root: ctx.config.root,
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
    cacheDir: path.join(ctx.config.root, "node_modules", ".vegas-content"),
  });

  const userContentHandler: Connect.NextHandleFunction = async (request, response, next) => {
    if (request.url) {
      const scheme = userContentServer.config.server.https ? "https" : "http";
      const url = new URL(request.url, `${scheme}://${request.headers.host}`);
      if (url.pathname === "/blank") {
        const html = new HTML();
        html.appendToHead("meta", [
          { name: "http-equiv", value: "X-UA-Compatible" },
          { name: "content", value: "IE=edge" },
        ]);
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html");
        response.end(html.toString());
        return;
      } else if (url.pathname === "/userCodeAppPanel") {
        const html = new HTML();
        html.appendToHead(
          "style",
          "html, body, iframe {border: 0; display: block; height: 100%; margin: 0; padding: 0; width: 100%;}iframe#userHtmlFrame {overflow-y: scroll; -webkit-overflow-scrolling: touch;}",
        );
        let uuid = "";
        for (const [key, value] of idMap) {
          if (value.expiredAt <= Date.now()) {
            idMap.delete(key);
          } else if (!value.use) {
            uuid = key;
            value.use = true;
            break;
          }
        }
        const hostOrigin = `${url.protocol}//${url.hostname}:${hostServer.config.server.port}`;
        html.appendToHead(
          "script",
          `window.vegas = { id: "${uuid}", hostOrigin: "${hostOrigin}", requestMap: new Map() }`,
        );
        html.appendToHead("script", [
          { name: "type", value: "module" },
          { name: "src", value: "/@vegas/client" },
        ]);

        html.appendToBody("iframe", [
          { name: "id", value: "userHtmlFrame" },
          {
            name: "allow",
            value:
              "accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *",
          },
          { name: "src", value: "/blank" },
        ]);

        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html");
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

export async function runServe(root?: string) {
  const resolvedRoot = path.resolve(root ?? ".");
  const userConfig = await loadConfig(resolvedRoot);
  const resolvedUserConfig = resolveConfig(userConfig);
  const projectSource = await collectSources(resolvedUserConfig);
  const clientEntries = detectClientEntries(projectSource.clientSources);

  const builderConfig = createBuilderConfig(resolvedUserConfig, projectSource, clientEntries);
  const builder = await createBuilder(builderConfig);
  const result = await buildApp(builder);
  const sources = extractOutput(result);
  const ctx = createServeContext(resolvedUserConfig, sources);
  await loadMock(ctx, projectSource.gasMockSources);

  await serveApp(ctx, builder);
}
