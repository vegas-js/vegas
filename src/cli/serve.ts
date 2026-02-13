import { join } from "node:path";
import { createLogger, createServer } from "vite";
import { Plugin } from "vite";

import {
  collectSources,
  detectEntries,
  mappingProjectIO,
  ProjectEntry,
  ProjectIOMap,
} from "./analyze";
import { loadConfig, resolveConfig, ResolvedUserConfig } from "./config";
import { resolvePath } from "./path";

function vegasServe(projectEntry: ProjectEntry, projectIOMap: ProjectIOMap[]): Plugin {
  const VIRTUAL_ID: string = "virtual:vegasserve";

  return {
    name: "vite-plugin-vegasserve",

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
          const port = server.config.server.port;
          const baseUrl = `${scheme}://${host}:${port}`;
          const url = new URL(request.url, baseUrl);
          if (url.pathname === "/") {
            // redirect to iframe
            response.statusCode = 301;
            response.setHeader("Location", `/dev${url.search}`);
            response.end();
            return;
          } else if (
            /^\/(exec|dev)/.test(url.pathname) &&
            request.headers["sec-fetch-dest"] !== "iframe"
          ) {
            // response iframe
            const iframeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    html, body, iframe#sandboxFrame {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
    }
    iframe#sandboxFrame {
      border: none;
      display: block;
    }
  </style>
</head>
<body>
  <iframe id="sandboxFrame" title="sample" allow="accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *" sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation allow-storage-access-by-user-activation" src="${baseUrl}/userCodeAppPanel">
</iframe>
</body>
</html>`;

            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html");
            response.end(iframeHtml);
            return;
          } else if (
            request.headers["sec-fetch-dest"] === "iframe" &&
            url.pathname === "/userCodeAppPanel"
          ) {
            // response content at requested by iframe
            const module = await server.ssrLoadModule(VIRTUAL_ID);
            const targetFunc = module.__merged["doGet"];
            if (typeof targetFunc !== "function") {
              throw new Error("Function doGet not found in mock server module.");
            }

            // TODO: HTML create from HTMLOutput
            const result = await targetFunc();
            const entry = projectIOMap.find((ioMap) => ioMap.outputPath === `${result}.html`);
            if (entry) {
              const rawHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script>
    class GASRun {
      constructor(scb, fcb) {
        this.scb = scb;
        this.fcb = fcb;
      }

      __exec(func, ...args) {
        try {
          fetch("/@vegas/" + func, {
            method: "POST",
            body: JSON.stringify(args),
            headers: { "Content-Type": "application/json" },
          }).then((response) => {
            if (!response.ok) {
              response.json().then((errorData) => {
                this.fcb("Mock function " + errorData + " failed with status " + response.status + ". Message: " + errorData.error);
              });
            }

            response.json().then((json) => this.scb(json));
          });
        } catch (error) {
          this.fcb(error);
        }
      }

      withSuccessHandler(callback) {
        return new GASRun(callback, this.fcb);
      }
      withFailureHandler(callback) {
        return new GASRun(this.scb, callback);
      }

      ${Object.keys(module.__merged)
        .map((func) => `${func}(...args) { this.__exec("${func}", args); }`)
        .join("\n      ")}
    };
    google = {
      script: {
        run: new GASRun(null, null),
      },
    };
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${entry.entryPath}"></script>
</body>
</html>`;

              const html = await server.transformIndexHtml(url.href, rawHtml);
              response.statusCode = 200;
              response.setHeader("Content-Type", "text/html");
              response.end(html);
              return;
            }
          } else if (url.pathname.startsWith("/@vegas/")) {
            // response at requested by GAS client
            const functionName = url.pathname.replace("/@vegas/", "");

            const args = await new Promise<any[]>((resolve) => {
              let body = "";
              request.on("data", (chunk) => {
                body += chunk;
              });
              request.on("end", () => {
                try {
                  resolve(JSON.parse(body));
                } catch {
                  resolve([]);
                }
              });
            });

            // call mock function
            const module = await server.ssrLoadModule(VIRTUAL_ID);
            const targetFunc = module.__merged[functionName];
            if (typeof targetFunc !== "function") {
              throw new Error(`Function ${functionName} not found in mock server module.`);
            }

            const result = await targetFunc(...args);

            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(result ?? null));
            return;
          }
          next();
        }
      });
    },

    resolveId(source, _importer, _options) {
      if (source === VIRTUAL_ID) {
        return `\0${VIRTUAL_ID}`;
      }
    },

    load(id, _options) {
      if (id === `\0${VIRTUAL_ID}`) {
        const virtualModule = `import * as module from '${projectEntry.serverEntry}'
export const __merged = {};
Object.keys(module).forEach((key) => {
  __merged[key] = module[key];
});`;

        return virtualModule;
      }
    },
  };
}

async function serveApp(
  config: ResolvedUserConfig,
  projectEntry: ProjectEntry,
  projectIOMap: ProjectIOMap[],
) {
  const server = await createServer({
    root: config.root,
    configFile: false,
    plugins: [...config.plugins, vegasServe(projectEntry, projectIOMap)],
    customLogger: createLogger("info", { prefix: "[vegas]" }),
    cacheDir: join(config.root, "node_modules", ".vegas"),
  });

  await server.listen();
  server.printUrls();
  server.bindCLIShortcuts({ print: true });
}

export async function runServe(root?: string) {
  const resolvedRoot = resolvePath(root);
  const userConfig = await loadConfig(resolvedRoot);
  const resolvedUserConfig = resolveConfig(userConfig);
  const projectSource = collectSources(resolvedUserConfig);
  const projectEntry = detectEntries(projectSource);
  const projectIOMap = mappingProjectIO(resolvedUserConfig, projectEntry);

  await serveApp(resolvedUserConfig, projectEntry, projectIOMap);
}
