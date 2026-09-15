import crypto from "node:crypto";
import path from "node:path";

import { type Connect, type ViteBuilder, createLogger, createServer } from "vite";

import { buildApp } from "../../build";
import { createGasDoGetEvent, createGasDoPostEvent } from "../../dev/webapp/event";
import { HtmlDocument } from "../../html";
import type { GasExecutor } from "../../runtime";
import type { ServeContext } from "./context";
import { createHostHtml } from "./hostHtml";

export async function serveApp(ctx: ServeContext, builder: ViteBuilder, executor: GasExecutor) {
  const idMap: Map<string, { use: boolean; expiredAt: number }> = new Map();
  let isBuilding = false;
  const promises: { resolve: (value: unknown) => void; reject: (reason?: any) => void }[] = [];

  const hostServer = await createServer({
    root: ctx.project.root,
    configFile: false,
    customLogger: createLogger("info", { prefix: "[vegas]" }),
    cacheDir: path.join(ctx.project.root, "node_modules", ".vegas-host"),
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

  hostServer.watcher.add([ctx.project.clientDir, ctx.project.serverDir]);

  hostServer.watcher.on("change", async (filePath) => {
    isBuilding = true;
    try {
      if (filePath.startsWith(ctx.project.clientDir)) {
        const artifacts = await buildApp(builder, /^client\d+$/);
        ctx.artifacts.write(artifacts);
        isBuilding = false;
        promises.forEach((promise) => promise.resolve(undefined));
        hostServer.moduleGraph.invalidateAll();
        hostServer.ws.send({ type: "full-reload" });
        return [];
      } else if (filePath.startsWith(ctx.project.serverDir)) {
        const artifacts = await buildApp(builder, /^server$/);
        ctx.artifacts.write(artifacts);
        isBuilding = false;
        promises.forEach((promise) => promise.resolve(undefined));
        return [];
      }
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
      isBuilding = false;
      promises.forEach((promise) => promise.reject(err));
      return [];
    }
  });

  hostServer.ws.on("vegas:init", async (data, client) => {
    if (isBuilding) {
      await new Promise((resolve, reject) => promises.push({ resolve, reject }));
    }
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
    if (isBuilding) {
      await new Promise((resolve, reject) => promises.push({ resolve, reject }));
    }
    try {
      const args = Array.isArray(data.args) ? data.args : [data.args];
      const result = await executor.execute({
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
    if (isBuilding) {
      await new Promise((resolve, reject) => promises.push({ resolve, reject }));
    }
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

        if (request.method === "GET") {
          const doGetEvent = createGasDoGetEvent(url);

          let uuid = "";

          do {
            uuid = crypto.randomUUID();
          } while (idMap.has(uuid));

          idMap.set(uuid, {
            use: false,
            expiredAt: Date.now() + 1000 * 30,
          });

          const result = await executor.execute({
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

            const result = await executor.execute({
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
    root: ctx.project.root,
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
    cacheDir: path.join(ctx.project.root, "node_modules", ".vegas-content"),
  });

  const userContentHandler: Connect.NextHandleFunction = async (request, response, next) => {
    if (isBuilding) {
      await new Promise((resolve, reject) => promises.push({ resolve, reject }));
    }
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
        html.appendToHead("script", {
          text: `window.vegas = { id: "${uuid}", hostOrigin: "${hostOrigin}", requestMap: new Map() }`,
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
