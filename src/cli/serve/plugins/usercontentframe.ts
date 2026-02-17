import vm from "node:vm";
import { Plugin } from "vite";

import { ProjectEntry, ProjectIOMap } from "../../analyze";

export function userContentFrame(projectEntry: ProjectEntry, projectIOMap: ProjectIOMap[]): Plugin {
  const VIRTUAL_ID: string = "virtual:usercontentframe";

  return {
    name: "vite-plugin-usercontentframe",

    async configureServer(server) {
      const module = await server.ssrLoadModule(VIRTUAL_ID);
      const rawContext: Record<string, any> = {};
      Object.entries(module).forEach(([key, value]) => {
        rawContext[key] = value;
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
          const port = server.config.server.port;
          const baseUrl = `${scheme}://${host}:${port}`;
          const url = new URL(request.url, baseUrl);
          if (url.pathname === "/userCodeAppPanel") {
            if (request.headers["sec-fetch-dest"] !== "iframe") {
              const blankHtml = `<!DOCTYPE html><html><head><meta http-equiv="X-UA-Compatible" content="IE=edge"></head><body></body></html>\n`;

              response.statusCode = 200;
              response.setHeader("Content-Type", "text/html");
              response.end(blankHtml);
              return;
            }
            // response content at requested by iframe
            const context = vm.createContext(rawContext);
            const targetFunc = context["doGet"];
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

      ${Object.keys(module)
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
            const context = vm.createContext(rawContext);
            const targetFunc = context[functionName];
            if (typeof targetFunc !== "function") {
              throw new Error(`Function ${functionName} not found in mock server module.`);
            }

            const result = await targetFunc(...args);

            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(result ?? null));
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
