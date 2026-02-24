import vm from "node:vm";

import { defaultTreeAdapter, html, serialize } from "parse5";
import { build as buildWithRolldownApi, OutputChunk, RolldownOutput } from "rolldown";
import { build as buildWithViteApi, Plugin } from "vite";

import { MockTarget } from "../../../../shared/gas";
import { ProjectEntry } from "../../../analyze";
import { exportBridge } from "../../../build/plugins/exportbridge";
import { virtualHTML } from "../../../build/plugins/virtualhtml";
import { ResolvedUserConfig } from "../../../config";
import { GASConsole } from "./gasapi/base/console";
import { GASLogger } from "./gasapi/base/logger";
import { GASSession } from "./gasapi/base/session";
import { GASCache } from "./gasapi/cache";
import { GASCacheService } from "./gasapi/cacheservice";
import { GASHtmlService } from "./gasapi/htmlservice";
import { GASProperties } from "./gasapi/properties";
import { GASPropertiesService } from "./gasapi/propertiesservice";
import { GASUrlFetchApp } from "./gasapi/urlfetchapp";

function buildWithVite(config: ResolvedUserConfig, webEntry: string) {
  return buildWithViteApi({
    root: config.root,
    configFile: false,
    plugins: [...config.plugins, virtualHTML({ webDir: config.webDir, webEntry: webEntry })],
    build: {
      rolldownOptions: {
        input: webEntry,
      },
      outDir: config.output.dir,
      write: false,
    },
    logLevel: "silent",
  });
}

function buildWithRolldown(config: ResolvedUserConfig, serverEntry: string) {
  return buildWithRolldownApi({
    cwd: config.root,
    input: serverEntry,
    plugins: [exportBridge(serverEntry)],
    output: {
      format: "iife",
      name: "GASApp",
      exports: "named",
    },
    write: false,
  });
}

export function hostFrame(
  config: ResolvedUserConfig,
  projectEntry: ProjectEntry,
  gasMockSources: string[],
): Plugin {
  const userCodes = {
    web: { hrefs: [] as string[], map: new Map<string, string>() },
    server: new vm.Script(""),
  };
  const mockSeed: Record<string, any> = {};
  const inMemoryStore = {
    documentProperties: new GASProperties(),
    scriptProperties: new GASProperties(),
    userProperties: new GASProperties(),
    documentCache: new GASCache(),
    scriptCache: new GASCache(),
    userCache: new GASCache(),
  };

  return {
    name: "vite-plugin-hostframe",

    async handleHotUpdate(ctx) {
      if (ctx.file.startsWith(config.webDir)) {
        const frontResult = await Promise.all(
          projectEntry.webEntries.map((webEntry) => buildWithVite(config, webEntry)),
        );
        const newWeb = new Map<string, string>();
        frontResult.flat().forEach((result) => {
          (result as RolldownOutput).output.flat().forEach((out) => {
            if (out.type === "asset") {
              newWeb.set(out.fileName, Buffer.from(out.source).toString("utf8"));
            }
          });
        });
        userCodes.web.map = newWeb;
        ctx.server.moduleGraph.invalidateAll();
        for (const href of userCodes.web.hrefs) {
          const mod = await ctx.server.moduleGraph.getModuleByUrl(href);
          if (mod) {
            ctx.server.moduleGraph.invalidateModule(mod);
          }
        }
        ctx.server.ws.send({ type: "full-reload" });
        return [];
      } else if (ctx.file.startsWith(config.serverDir)) {
        const serverResult = await buildWithRolldown(config, projectEntry.serverEntry);
        const serverOutput = serverResult.output.flat()[0] as OutputChunk;
        userCodes.server = new vm.Script(serverOutput.code);
        return [];
      }
    },

    async configureServer(server) {
      const frontResult = await Promise.all(
        projectEntry.webEntries.map((webEntry) => buildWithVite(config, webEntry)),
      );
      const newMap = new Map<string, string>();
      frontResult.flat().forEach((result) => {
        (result as RolldownOutput).output.flat().forEach((out) => {
          if (out.type === "asset") {
            newMap.set(out.fileName, Buffer.from(out.source).toString("utf8"));
          }
        });
      });
      userCodes.web.map = newMap;
      const serverResult = await buildWithRolldown(config, projectEntry.serverEntry);
      const serverOutput = serverResult.output.flat()[0] as OutputChunk;
      userCodes.server = new vm.Script(serverOutput.code);
      for (const source of gasMockSources) {
        const mod = await server.ssrLoadModule(source);
        const mock = mod.default;

        switch (mock.target) {
          case MockTarget.Properties: {
            inMemoryStore.documentProperties.setProperties(mock?.documentProperties ?? {});
            inMemoryStore.scriptProperties.setProperties(mock?.scriptProperties ?? {});
            inMemoryStore.userProperties.setProperties(mock?.userProperties ?? {});
            break;
          }
          case MockTarget.Session: {
            mockSeed[mock.target] = mock;
            break;
          }
          // TODO
        }
      }

      server.watcher.add([config.webDir, config.serverDir]);

      server.ws.on("vegas:gascall", async (data, client) => {
        try {
          const scriptContext = vm.createContext({
            console: new GASConsole(),
            Logger: new GASLogger(),
            HtmlService: new GASHtmlService(userCodes.web.map),
            CacheService: new GASCacheService(
              inMemoryStore.documentCache,
              inMemoryStore.scriptCache,
              inMemoryStore.userCache,
            ),
            PropertiesService: new GASPropertiesService(
              inMemoryStore.documentProperties,
              inMemoryStore.scriptProperties,
              inMemoryStore.userProperties,
            ),
            Session: new GASSession(config, mockSeed["Session"]),
            UrlFetchApp: new GASUrlFetchApp(),
          });
          userCodes.server.runInContext(scriptContext);
          const targetFunc = scriptContext[data.func];
          if (typeof targetFunc !== "function") {
            throw new Error(`Function ${data.payload.func} not found in mock server module.`);
          }
          const result = await targetFunc(...JSON.parse(data.args));
          client.send("vegas:gasreturn", {
            id: data.id,
            status: "ok",
            result: JSON.stringify(result),
          });
        } catch (error) {
          client.send("vegas:gasreturn", {
            id: data.id,
            status: "err",
            message: (error as any).message,
          });
        }
      });

      server.middlewares.use(async (request, response, next) => {
        if (request.url) {
          const scheme = server.config.server.https ? "https" : "http";
          const host =
            server.config.server.host !== undefined
              ? typeof server.config.server.host === "boolean"
                ? server.config.server.host
                  ? "0.0.0.0"
                  : "localhost"
                : server.config.server.host
              : "localhost";
          const contentPort = server.config.server.port + 1;
          const contentBaseUrl = `${scheme}://${host}:${contentPort}`;
          const url = new URL(request.url, contentBaseUrl);
          if (url.pathname === "/") {
            // redirect to iframe
            const basePath = server.config.mode === "production" ? "/exec" : "/dev";
            response.statusCode = 307;
            response.setHeader("Location", `${basePath}${url.search}`);
            response.end();
            return;
          } else if (/^\/(exec|dev)/.test(url.pathname)) {
            // response iframe
            if (!userCodes.web.hrefs.includes(url.href)) {
              userCodes.web.hrefs.push(url.href);
            }
            const scriptContext = vm.createContext({
              console: new GASConsole(),
              Logger: new GASLogger(),
              HtmlService: new GASHtmlService(userCodes.web.map),
              CacheService: new GASCacheService(
                inMemoryStore.documentCache,
                inMemoryStore.scriptCache,
                inMemoryStore.userCache,
              ),
              PropertiesService: new GASPropertiesService(
                inMemoryStore.documentProperties,
                inMemoryStore.scriptProperties,
                inMemoryStore.userProperties,
              ),
              Session: new GASSession(config, mockSeed["Session"]),
              UrlFetchApp: new GASUrlFetchApp(),
            });
            userCodes.server.runInContext(scriptContext);
            const htmlOutput: GoogleAppsScript.HTML.HtmlOutput = scriptContext.GASApp["doGet"]();

            const document = defaultTreeAdapter.createDocument();
            defaultTreeAdapter.setDocumentType(document, "html", "", "");
            const htmlTag = defaultTreeAdapter.createElement("html", html.NS.HTML, []);
            const headTag = defaultTreeAdapter.createElement("head", html.NS.HTML, []);

            const htmlOutputMetaTags = htmlOutput.getMetaTags();
            if (htmlOutputMetaTags.length > 0) {
              htmlOutputMetaTags.forEach((metaTag) => {
                const meta = defaultTreeAdapter.createElement("meta", html.NS.HTML, [
                  { name: "name", value: metaTag.getName() },
                  { name: "content", value: metaTag.getContent() },
                ]);
                defaultTreeAdapter.appendChild(headTag, meta);
              });
            }

            const htmlOutputTitle = htmlOutput.getTitle();
            if (htmlOutputTitle) {
              const title = defaultTreeAdapter.createElement("title", html.NS.HTML, []);
              defaultTreeAdapter.insertText(title, htmlOutputTitle);
              defaultTreeAdapter.appendChild(headTag, title);
            }

            const htmlOutputFaviconUrl = htmlOutput.getFaviconUrl();
            if (htmlOutputFaviconUrl) {
              const title = defaultTreeAdapter.createElement("link", html.NS.HTML, [
                { name: "rel", value: "shortcut icon" },
                { name: "type", value: "image/png" },
                { name: "href", value: htmlOutputFaviconUrl },
              ]);
              defaultTreeAdapter.appendChild(headTag, title);
            }

            const styleTag = defaultTreeAdapter.createElement("style", html.NS.HTML, []);
            defaultTreeAdapter.insertText(
              styleTag,
              "html,body,iframe#sandboxFrame{margin:0;padding:0;height:100%;width:100%;}iframe#sandboxFrame{border:none;display:block;};",
            );
            defaultTreeAdapter.appendChild(headTag, styleTag);

            const bodyTag = defaultTreeAdapter.createElement("body", html.NS.HTML, []);
            const iframeTag = defaultTreeAdapter.createElement("iframe", html.NS.HTML, [
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
              { name: "src", value: `${contentBaseUrl}/userCodeAppPanel` },
            ]);
            defaultTreeAdapter.appendChild(bodyTag, iframeTag);

            const scriptEntryTag = defaultTreeAdapter.createElement("script", html.NS.HTML, [
              { name: "type", value: "module" },
            ]);
            const initRecord: Record<string, any> = {};
            initRecord["userHtml"] = htmlOutput.getContent();
            defaultTreeAdapter.insertText(
              scriptEntryTag,
              `if (import.meta.hot) {
  import.meta.hot.on("vegas:gasreturn", (data) => {
    document.getElementById("sandboxFrame").contentWindow.postMessage({ type: "vegas:gasreturn", payload: data }, "${contentBaseUrl}");
  });
  window.addEventListener("message", (event) => {
    if (event.origin !== "${contentBaseUrl}") return;
    if (event.data.type === "vegas:gascall") import.meta.hot.send(event.data.type, event.data.payload);
  });
}
document.getElementById("sandboxFrame").onload = (event) => {
  event.currentTarget.contentWindow.postMessage({ type: "vegas:gasinit", payload: { host: window.location.origin,serverData: JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(initRecord))}"))}}, "${contentBaseUrl}");
}`,
            );
            defaultTreeAdapter.appendChild(bodyTag, scriptEntryTag);

            defaultTreeAdapter.appendChild(htmlTag, headTag);
            defaultTreeAdapter.appendChild(htmlTag, bodyTag);
            defaultTreeAdapter.appendChild(document, htmlTag);

            const transFormedHtml = await server.transformIndexHtml(url.href, serialize(document));
            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html");
            response.end(transFormedHtml);
            return;
          }
        }
        next();
      });
    },
  };
}
