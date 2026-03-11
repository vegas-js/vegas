import path from "node:path";

import { Connect, createBuilder, createLogger, createServer } from "vite";

import { buildApp, createBuilderConfig, extractOutput } from "../build";
import { HTML, resolvePath } from "../core";
import { collectSources, detectEntries } from "../core/analyze";
import { loadConfig, resolveConfig } from "../core/config";
import { createServeContext, ServeContext } from "./context";
import { createHostHtml } from "./hostHtml";
import { launchGAS } from "./launch";
import { loadMock } from "./mock";

async function serveApp(ctx: ServeContext) {
  const hostServer = await createServer({
    root: ctx.config.root,
    configFile: false,
    customLogger: createLogger("info", { prefix: "[vegas]" }),
    cacheDir: path.join(ctx.config.root, "node_modules", ".vegas-host"),
  });

  const builderConfig = createBuilderConfig(ctx.config, ctx.entry, false);
  const builder = await createBuilder(builderConfig);
  const result = await buildApp(builder);
  const output = extractOutput(result);
  ctx.code.web.map = output.web;
  ctx.code.server = output.server;

  hostServer.watcher.add([ctx.config.webDir, ctx.config.serverDir]);

  hostServer.watcher.on("change", async (path) => {
    if (path.startsWith(ctx.config.webDir)) {
      const result = await buildApp(builder, /^web/);
      const output = extractOutput(result);
      ctx.code.web.map = output.web;
      hostServer.moduleGraph.invalidateAll();
      for (const href of ctx.code.web.hrefs) {
        const mod = await hostServer.moduleGraph.getModuleByUrl(href);
        if (mod) {
          hostServer.moduleGraph.invalidateModule(mod);
        }
      }
      hostServer.ws.send({ type: "full-reload" });
      return [];
    } else if (path.startsWith(ctx.config.serverDir)) {
      const result = await buildApp(builder, /^gas$/);
      const output = extractOutput(result);
      ctx.code.server = output.server;
      return [];
    }
  });

  hostServer.ws.on("vegas:gascall", async (data, client) => {
    try {
      const result = await launchGAS(ctx, data.func, ...JSON.parse(data.args));
      client.send("vegas:gasreturn", {
        id: data.id,
        status: "ok",
        result,
      });
    } catch (error) {
      client.send("vegas:gasreturn", {
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
        if (!ctx.code.web.hrefs.includes(url.href)) {
          ctx.code.web.hrefs.push(url.href);
        }
        const result = JSON.parse(await launchGAS(ctx, "doGet"));
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
        html.appendToHead(
          "script",
          `window.vegas = { host: "${url.origin}", requestMap: new Map() }`,
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
  const resolvedRoot = resolvePath(root);
  const userConfig = await loadConfig(resolvedRoot);
  const resolvedUserConfig = resolveConfig(userConfig);
  const projectSource = await collectSources(resolvedUserConfig);
  const projectEntry = detectEntries(projectSource);
  const ctx = createServeContext(resolvedUserConfig, projectEntry);
  await loadMock(ctx, projectSource.gasMockSources);

  await serveApp(ctx);
}
