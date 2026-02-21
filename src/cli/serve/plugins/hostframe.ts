import { existsSync, readFileSync } from "node:fs";
import { join, parse } from "node:path";
import vm from "node:vm";

import { defaultTreeAdapter, html, serialize } from "parse5";
import { build as buildWithRolldown } from "rolldown";
import { build as buildWithVite, Plugin } from "vite";

import { ProjectEntry } from "../../analyze";
import { virtualHTML } from "../../build/plugins/virtualhtml";
import { ResolvedUserConfig } from "../../config";

class GASHtmlService implements GoogleAppsScript.HTML.HtmlService {
  #cacheDir: string;

  constructor(cacheDir: string) {
    this.#cacheDir = cacheDir;
  }

  SandboxMode = {
    EMULATED: 0,
    IFRAME: 1,
    NATIVE: 2,
  };
  XFrameOptionsMode = {
    ALLOWALL: 0,
    DEFAULT: 1,
  };

  createHtmlOutput(html?: unknown): GoogleAppsScript.HTML.HtmlOutput {
    if (typeof html !== "string") {
      throw new Error("Method not implemented.");
    }

    class GASHtmlOutput implements GoogleAppsScript.HTML.HtmlOutput {
      #title: string = "";
      #content: string = "";

      addMetaTag(_name: string, _content: string): GoogleAppsScript.HTML.HtmlOutput {
        throw new Error("Method not implemented.");
      }
      append(_addedContent: string): GoogleAppsScript.HTML.HtmlOutput {
        throw new Error("Method not implemented.");
      }
      appendUntrusted(_addedContent: string): GoogleAppsScript.HTML.HtmlOutput {
        throw new Error("Method not implemented.");
      }
      asTemplate(): GoogleAppsScript.HTML.HtmlTemplate {
        throw new Error("Method not implemented.");
      }
      clear(): GoogleAppsScript.HTML.HtmlOutput {
        throw new Error("Method not implemented.");
      }
      getAs(_contentType: string): GoogleAppsScript.Base.Blob {
        throw new Error("Method not implemented.");
      }
      getBlob(): GoogleAppsScript.Base.Blob {
        throw new Error("Method not implemented.");
      }
      getContent(): string {
        return this.#content;
      }
      getFaviconUrl(): string {
        throw new Error("Method not implemented.");
      }
      getHeight(): GoogleAppsScript.Integer {
        throw new Error("Method not implemented.");
      }
      getMetaTags(): GoogleAppsScript.HTML.HtmlOutputMetaTag[] {
        throw new Error("Method not implemented.");
      }
      getTitle(): string {
        return this.#title;
      }
      getWidth(): GoogleAppsScript.Integer {
        throw new Error("Method not implemented.");
      }
      setContent(content: string): GoogleAppsScript.HTML.HtmlOutput {
        this.#content = content;
        return this;
      }
      setFaviconUrl(_iconUrl: string): GoogleAppsScript.HTML.HtmlOutput {
        throw new Error("Method not implemented.");
      }
      setHeight(_height: GoogleAppsScript.Integer): GoogleAppsScript.HTML.HtmlOutput {
        throw new Error("Method not implemented.");
      }
      setSandboxMode(_mode: GoogleAppsScript.HTML.SandboxMode): GoogleAppsScript.HTML.HtmlOutput {
        throw new Error("Method not implemented.");
      }
      setTitle(title: string): GoogleAppsScript.HTML.HtmlOutput {
        this.#title = title;
        return this;
      }
      setWidth(_width: GoogleAppsScript.Integer): GoogleAppsScript.HTML.HtmlOutput {
        throw new Error("Method not implemented.");
      }
      setXFrameOptionsMode(
        _mode: GoogleAppsScript.HTML.XFrameOptionsMode,
      ): GoogleAppsScript.HTML.HtmlOutput {
        throw new Error("Method not implemented.");
      }
    }
    const output = new GASHtmlOutput();
    return output.setContent(html);
  }
  createHtmlOutputFromFile(filename: string): GoogleAppsScript.HTML.HtmlOutput {
    const parsedPath = parse(filename);
    const outputPath = join(this.#cacheDir, `${parsedPath.name}.html`);
    if (!existsSync(outputPath)) {
      throw new Error(`No HTML file named ${filename} was found.`);
    }

    return this.createHtmlOutput(readFileSync(outputPath, { encoding: "utf8" }));
  }
  createTemplate(_html: unknown): GoogleAppsScript.HTML.HtmlTemplate {
    throw new Error("Method not implemented.");
  }
  createTemplateFromFile(_filename: string): GoogleAppsScript.HTML.HtmlTemplate {
    throw new Error("Method not implemented.");
  }
  getUserAgent(): string {
    throw new Error("Method not implemented.");
  }
}

export function hostFrame(config: ResolvedUserConfig, projectEntry: ProjectEntry): Plugin {
  const VIRTUAL_ID: string = "virtual:hostFrame";

  return {
    name: "vite-plugin-hostframe",

    async handleHotUpdate(ctx) {
      if (ctx.file.startsWith(config.serverDir)) {
        const mod = ctx.server.moduleGraph.getModuleById(`\0${VIRTUAL_ID}`);
        if (mod) {
          ctx.server.moduleGraph.invalidateModule(mod);
        }
        return [];
      }
    },

    async configureServer(server) {
      const cacheDir = join(server.config.cacheDir, "build");
      await Promise.all([
        projectEntry.webEntries.map((webEntry) => {
          // oxlint-disable-next-line no-floating-promises
          buildWithVite({
            root: config.root,
            configFile: false,
            plugins: [
              ...config.plugins,
              virtualHTML({ webDir: config.webDir, webEntry: webEntry }),
            ],
            build: {
              rolldownOptions: {
                input: webEntry,
              },
              outDir: cacheDir,
              emptyOutDir: false,
            },
            logLevel: "silent",
          });
        }),
        buildWithRolldown({
          cwd: config.root,
          input: projectEntry.serverEntry,
          output: {
            format: "iife",
            name: "GASApp",
            exports: "named",
            dir: cacheDir,
          },
        }),
      ]);

      server.ws.on("vegas:gascall", async (data, client) => {
        try {
          const script = new vm.Script(
            readFileSync(join(cacheDir, "Code.js"), { encoding: "utf8" }),
          );
          const scriptContext = vm.createContext({
            HtmlService: new GASHtmlService(cacheDir),
          });
          script.runInContext(scriptContext);
          const targetFunc = scriptContext.GASApp[data.func];
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
            const script = new vm.Script(
              readFileSync(join(cacheDir, "Code.js"), { encoding: "utf8" }),
            );
            const scriptContext = vm.createContext({
              HtmlService: new GASHtmlService(cacheDir),
            });
            script.runInContext(scriptContext);
            const htmlOutput = scriptContext.GASApp["doGet"]();

            const document = defaultTreeAdapter.createDocument();
            defaultTreeAdapter.setDocumentType(document, "html", "", "");
            const htmlTag = defaultTreeAdapter.createElement("html", html.NS.HTML, []);
            const headTag = defaultTreeAdapter.createElement("head", html.NS.HTML, []);

            const htmlOutputTitle = htmlOutput.getTitle();
            if (htmlOutputTitle) {
              const title = defaultTreeAdapter.createElement("title", html.NS.HTML, []);
              defaultTreeAdapter.insertText(title, htmlOutputTitle);
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
            initRecord["functionNames"] = ["getName"];
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
document.getElementById("sandboxFrame").onload = (event) => event.currentTarget.contentWindow.postMessage({ type: "vegas:gasinit", payload: JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(initRecord))}"))}, "${contentBaseUrl}");`,
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

    resolveId(source, _importer, _options) {
      if (source === VIRTUAL_ID) {
        return `\0${VIRTUAL_ID}`;
      }
    },

    load(id, _options) {
      if (id === `\0${VIRTUAL_ID}`) {
        return `export * from "${projectEntry.serverEntry}";`;
      }
    },
  };
}
