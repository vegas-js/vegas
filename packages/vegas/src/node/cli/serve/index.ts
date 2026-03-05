import path from "node:path";

import { Connect, createLogger, createServer } from "vite";

import { buildApp } from "../build";
import { HTML, resolvePath } from "../core";
import { collectSources, detectEntries } from "../core/analyze";
import { loadConfig, resolveConfig } from "../core/config";
import { createServeContext, ServeContext } from "./context";
import { launchGAS } from "./launch";
import { loadMock } from "./mock";

async function serveApp(ctx: ServeContext) {
  const hostServer = await createServer({
    root: ctx.config.root,
    configFile: false,
    customLogger: createLogger("info", { prefix: "[vegas]" }),
    cacheDir: path.join(ctx.config.root, "node_modules", ".vegas-host"),
  });

  const result = await buildApp(ctx.config, ctx.entry);
  ctx.code.web.map = result!.web;
  ctx.code.server = result!.server;

  hostServer.watcher.add([ctx.config.webDir, ctx.config.serverDir]);

  hostServer.watcher.on("change", async (path) => {
    if (path.startsWith(ctx.config.webDir)) {
      const result = await buildApp(ctx.config, ctx.entry, false, /^web/);
      ctx.code.web.map = result!.web;
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
      const result = await buildApp(ctx.config, ctx.entry, false, /^gas$/);
      ctx.code.server = result!.server;
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
        const html = new HTML();

        if (result.metaTags > 0) {
          (result.metaTags as { name: string; content: string }[]).forEach((metaTag) => {
            html.appendToHead("meta", [
              { name: "name", value: metaTag.name },
              { name: "content", value: metaTag.content },
            ]);
          });
        }

        if (result.title) {
          html.appendToHead("title", result.title);
        }

        if (result.faviconUrl) {
          html.appendToHead("link", [
            { name: "rel", value: "shortcut icon" },
            { name: "type", value: "image/png" },
            { name: "href", value: result.faviconUrl },
          ]);
        }

        html.appendToHead(
          "style",
          "html,body,iframe#sandboxFrame{margin:0;padding:0;height:100%;width:100%;}iframe#sandboxFrame{border:none;display:block;};",
        );

        html.appendToBody("iframe", [
          { name: "id", value: "sandboxFrame" },
          {
            name: "allow",
            value:
              "accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *",
          },
          {
            name: "sandbox",
            value:
              "allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation allow-storage-access-by-user-activation",
          },
          { name: "src", value: `${url.origin}/userCodeAppPanel` },
        ]);
        const initRecord: Record<string, any> = {};
        initRecord["userHtml"] = result.content;
        html.appendToBody(
          "script",
          `if (import.meta.hot) {
  import.meta.hot.on("vegas:gasreturn", (data) => {
    document.getElementById("sandboxFrame").contentWindow.postMessage({ type: "vegas:gasreturn", payload: data }, "${url.origin}");
  });
  window.addEventListener("message", (event) => {
    if (event.origin !== "${url.origin}") return;
    if (event.data.type === "vegas:gascall") import.meta.hot.send(event.data.type, event.data.payload);
  });
}
document.getElementById("sandboxFrame").onload = (event) => {
  event.currentTarget.contentWindow.postMessage({ type: "vegas:gasinit", payload: { host: window.location.origin, serverData: JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(initRecord))}"))}}, "${url.origin}");
}`,
          [{ name: "type", value: "module" }],
        );
        const transFormedHtml = await hostServer.transformIndexHtml(url.href, html.toString());
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
  const projectSource = collectSources(resolvedUserConfig);
  const projectEntry = detectEntries(projectSource);
  const ctx = createServeContext(resolvedUserConfig, projectEntry);
  await loadMock(ctx, projectSource.gasMockSources);

  await serveApp(ctx);
}
