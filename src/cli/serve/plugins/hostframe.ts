import { existsSync, readFileSync } from "node:fs";
import { join, parse } from "node:path";

import { defaultTreeAdapter, html, serialize } from "parse5";
import { build, Plugin } from "vite";

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
        throw new Error("Method not implemented.");
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
      setTitle(_title: string): GoogleAppsScript.HTML.HtmlOutput {
        throw new Error("Method not implemented.");
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
  const context: any = {};

  return {
    name: "vite-plugin-hostframe",

    async handleHotUpdate(ctx) {
      if (ctx.file.startsWith(config.serverDir)) {
        context.module = await ctx.server.ssrLoadModule(VIRTUAL_ID);
        return [];
      }
    },

    async configureServer(server) {
      const cacheDir = join(server.config.cacheDir, "build");
      await Promise.all(
        projectEntry.webEntries.map((webEntry) => {
          // oxlint-disable-next-line no-floating-promises
          build({
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
      );
      globalThis["HtmlService"] = new GASHtmlService(cacheDir);
      context.module = await server.ssrLoadModule(VIRTUAL_ID);

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
            const document = defaultTreeAdapter.createDocument();
            defaultTreeAdapter.setDocumentType(document, "html", "", "");
            const htmlTag = defaultTreeAdapter.createElement("html", html.NS.HTML, []);
            const headTag = defaultTreeAdapter.createElement("head", html.NS.HTML, []);

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

            const scriptEntryTag = defaultTreeAdapter.createElement("script", html.NS.HTML, []);
            const initRecord: Record<string, any> = {};
            initRecord["functionNames"] = ["getName"];
            initRecord["sandboxHost"] =
              "https://n-fsh3x2pqq3gx6tou3rizqs5bu4mmjkamlunsm3i-0lu-script.googleusercontent.com";

            initRecord["userHtml"] = context.module["doGet"]().getContent();
            defaultTreeAdapter.insertText(
              scriptEntryTag,
              `document.getElementById("sandboxFrame").onload = (event) => event.currentTarget.contentWindow.postMessage(JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(initRecord))}")), "${contentBaseUrl}");`,
            );
            defaultTreeAdapter.appendChild(bodyTag, scriptEntryTag);

            defaultTreeAdapter.appendChild(htmlTag, headTag);
            defaultTreeAdapter.appendChild(htmlTag, bodyTag);
            defaultTreeAdapter.appendChild(document, htmlTag);

            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html");
            response.end(serialize(document));
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
