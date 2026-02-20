import { defaultTreeAdapter, html, serialize } from "parse5";
import { RolldownOutput } from "rolldown";
import { build, Plugin } from "vite";

import { ProjectEntry } from "../../analyze";
import { virtualHTML } from "../../build/plugins/virtualhtml";
import { ResolvedUserConfig } from "../../config";

export function hostFrame(config: ResolvedUserConfig, projectEntry: ProjectEntry): Plugin {
  return {
    name: "vite-plugin-hostframe",

    configureServer(server) {
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
            const scriptInitTag = defaultTreeAdapter.createElement("script", html.NS.HTML, [
              { name: "src", value: "/@vegas/script/init" },
            ]);
            defaultTreeAdapter.appendChild(headTag, scriptInitTag);

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
            const result = await build({
              root: config.root,
              configFile: false,
              plugins: [
                ...config.plugins,
                virtualHTML({ webDir: config.webDir, webEntry: projectEntry.webEntries[0] }),
              ],
              build: {
                rolldownOptions: {
                  input: projectEntry.webEntries[0],
                },
                outDir: config.output.dir,
                emptyOutDir: false,
                write: false,
              },
              logLevel: "silent",
            });

            const output = Array.isArray(result)
              ? result[0].output
              : (result as RolldownOutput).output;
            const asset = output.filter((out) => out.type === "asset")[0];
            const outputHtml = Buffer.from(asset.source).toString("utf8");
            const initRecord: Record<string, any> = {};
            initRecord["functionNames"] = ["getName"];
            initRecord["sandboxHost"] =
              "https://n-fsh3x2pqq3gx6tou3rizqs5bu4mmjkamlunsm3i-0lu-script.googleusercontent.com";
            initRecord["userHtml"] = outputHtml;
            defaultTreeAdapter.insertText(
              scriptEntryTag,
              `const iframe = document.getElementById("sandboxFrame");
iframe.onload = function() {
  vegas.script.init("${encodeURIComponent(JSON.stringify(initRecord))}");
}`,
            );
            defaultTreeAdapter.appendChild(bodyTag, scriptEntryTag);

            defaultTreeAdapter.appendChild(htmlTag, headTag);
            defaultTreeAdapter.appendChild(htmlTag, bodyTag);
            defaultTreeAdapter.appendChild(document, htmlTag);

            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html");
            response.end(serialize(document));
            return;
          } else if (url.pathname === "/@vegas/script/init") {
            const script = `window.vegas = {
  script: {
    init(args) {
      const iframe = document.getElementById("sandboxFrame");
      iframe.contentWindow.postMessage(JSON.parse(decodeURIComponent(args)), "${contentBaseUrl}");
    }
  }
}`;

            response.statusCode = 200;
            response.setHeader("Content-Type", "text/javascript");
            response.end(script);
            return;
          }
        }
        next();
      });
    },
  };
}
