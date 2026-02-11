import { join, resolve } from "node:path";
import { createLogger, createServer } from "vite";
import { Plugin } from "vite";

import {
  collectSources,
  detectEntries,
  mappingProjectIO,
  ProjectIOMap,
  ProjectSource,
} from "./analyze";
import { loadConfig, resolveConfig } from "./config";
import { ResolvedUserConfig } from "./lib";
import { resolvePath } from "./path";

function vegasServe(
  config: ResolvedUserConfig,
  projectSource: ProjectSource,
  projectIOMap: ProjectIOMap[],
): Plugin {
  const VIRTUAL_ID: string = "virtual:vegasserve";

  return {
    name: "vite-plugin-vegasserve",

    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url) {
          const matches = request.url.match(/^(\/[^?]*)(.*)/) ?? [""];
          const urlPath = matches[1];
          const urlParams = matches[2] ?? "";
          if (urlPath === "/") {
            // redirect to iframe
            response.statusCode = 301;
            response.setHeader("Location", `/dev${urlParams}`);
            response.end();
            return;
          } else if (
            /^\/(exec|dev)/.test(urlPath) &&
            request.headers["sec-fetch-dest"] !== "iframe"
          ) {
            // response iframe
            const urlSubPathAndParams = urlPath.match(/^\/(exec|dev)\/(.*)$/)?.[2] ?? "";
            console.log(urlSubPathAndParams);
            const host =
              server.config.server.host !== undefined
                ? typeof server.config.server.host === "boolean"
                  ? "0.0.0.0"
                  : server.config.server.host
                : "localhost";
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
  <iframe id="sandboxFrame" title="sample" allow="accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *" sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation allow-storage-access-by-user-activation" src="http://${host}:${server.config.server.port}/userCodeAppPanel">
</iframe>
</body>
</html>`;

            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html");
            response.end(iframeHtml);
            return;
          } else if (
            request.headers["sec-fetch-dest"] === "iframe" &&
            urlPath === "/userCodeAppPanel"
          ) {
            // response content at requested by iframe
            const module = await server.ssrLoadModule(VIRTUAL_ID);
            const targetFunc = module.__merged["doGet"];
            if (typeof targetFunc !== "function") {
              throw new Error("Function doGet not found in mock server module.");
            }

            // TODO: HTML create from HTMLOutput
            const result = await targetFunc();
            const subUrl = request.url.slice(urlPath.length);
            console.log(subUrl);
            const entry = projectIOMap.find((ioMap) => ioMap.outputPath === `${result}.html`);
            if (entry) {
              const rawHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${entry.entryPath}"></script>
</body>
</html>`;
              const html = await server.transformIndexHtml(subUrl, rawHtml);
              response.statusCode = 200;
              response.setHeader("Content-Type", "text/html");
              response.end(html);
              return;
            }
          } else if (urlPath.startsWith("/@vegas/")) {
            // response at requested by GAS client
            const functionName = urlPath.replace("/@vegas/", "");

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
        const importModules: string[] = [];
        const spreadModules: string[] = [];

        projectSource.serverSources.forEach((entry, index) => {
          importModules.push(`import * as mod${index} from '${resolve("./", entry)}';`);
          spreadModules.push(`...mod${index}`);
        });

        const virtualModule = `
      ${importModules.join("\n")}
      export const __merged = {};
      [${projectSource.serverSources.map((_, index) => `mod${index}`).join(", ")}].forEach(module => {
        Object.keys(module).forEach((key) => {
          __merged[key] = module[key];
        });
      });
      `;

        return virtualModule;
      }
    },
  };
}

async function serveApp(
  config: ResolvedUserConfig,
  projectSource: ProjectSource,
  projectIOMap: ProjectIOMap[],
) {
  const server = await createServer({
    root: config.root,
    configFile: false,
    plugins: [...config.plugins, vegasServe(config, projectSource, projectIOMap)],
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

  await serveApp(resolvedUserConfig, projectSource, projectIOMap);
}
