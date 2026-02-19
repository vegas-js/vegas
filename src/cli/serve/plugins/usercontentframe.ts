import vm from "node:vm";

import { defaultTreeAdapter, html, serialize } from "parse5";
import { Plugin } from "vite";

import { ProjectEntry, ProjectIOMap } from "../../analyze";

export function userContentFrame(
  serverDir: string,
  projectEntry: ProjectEntry,
  projectIOMap: ProjectIOMap[],
): Plugin {
  const VIRTUAL_ID: string = "virtual:usercontentframe";

  return {
    name: "vite-plugin-usercontentframe",

    async handleHotUpdate(ctx) {
      if (ctx.file.startsWith(serverDir)) {
        const module = await ctx.server.ssrLoadModule(VIRTUAL_ID);
        const functions: string[] = [];
        Object.keys(module).forEach((key) => {
          functions.push(key);
        });
        ctx.server.ws.send("vegas:initvegasrun", {
          script: `    window.vegasGASRunProxyHandler = {
      get(target, property, receiver) {
        if (target[property]) {
          return (...args) => target[property](...args);
        }
        target.fcb(new Error(property + " is not function."));
      },
    };
    window.vegasGASRun = class {
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
            if (response.status !== 200) {
              response.text().then((errorMessage) => {
                this.fcb("Mock function [" + func + "] failed with status " + response.status + ". Message: " + errorMessage);
              });
            }

            response.json().then((json) => this.scb(json));
          });
        } catch (error) {
          this.fcb(error);
        }
      }

      withSuccessHandler(callback) {
        return new Proxy(new vegasGASRun(callback, this.fcb), vegasGASRunProxyHandler);
      }
      withFailureHandler(callback) {
        return new Proxy(new vegasGASRun(this.scb, callback), vegasGASRunProxyHandler);
      }

      ${functions
        .map((func) => `${func}(...args) { this.__exec("${func}", ...args); }`)
        .join("\n      ")}
    };
    window.google = {
      script: {
        run: new Proxy(new vegasGASRun(null, null), vegasGASRunProxyHandler),
      },
    };`,
        });
      }
    },

    async configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url) {
          const module = await server.ssrLoadModule(VIRTUAL_ID);
          const rawContext: Record<string, any> = {};
          Object.entries(module).forEach(([key, value]) => {
            rawContext[key] = value;
          });
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
            // const context = vm.createContext(rawContext);
            // const targetFunc = context["doGet"];
            // if (typeof targetFunc !== "function") {
            //   throw new Error("Function doGet not found in mock server module.");
            // }

            // TODO: HTML create from HTMLOutput
            // const result = await targetFunc();
            // const entry = projectIOMap.find((ioMap) => ioMap.outputPath === `${result}.html`);
            const entry = projectIOMap.find((ioMap) => ioMap.outputPath === "index.html");
            if (entry) {
              const document = defaultTreeAdapter.createDocument();
              defaultTreeAdapter.setDocumentType(document, "html", "", "");
              const htmlTag = defaultTreeAdapter.createElement("html", html.NS.HTML, []);
              const headTag = defaultTreeAdapter.createElement("head", html.NS.HTML, []);
              const scriptVegasModuleTag = defaultTreeAdapter.createElement(
                "script",
                html.NS.HTML,
                [{ name: "type", value: "module" }],
              );
              defaultTreeAdapter.insertText(
                scriptVegasModuleTag,
                `if (import.meta.hot) {
  import.meta.hot.on('vegas:initvegasrun', (data) => {
    const oldScript = document.getElementById('vegasrun');
    if (oldScript) {
      document.head.removeChild(oldScript);
    }
    const newScript = document.createElement('script');
    newScript.id = 'vegasrun';
    newScript.textContent = data.script;
    document.head.appendChild(newScript);
  });
}`,
              );
              defaultTreeAdapter.appendChild(headTag, scriptVegasModuleTag);
              const scriptVegasGASRunTag = defaultTreeAdapter.createElement(
                "script",
                html.NS.HTML,
                [{ name: "id", value: "vegasrun" }],
              );
              defaultTreeAdapter.insertText(
                scriptVegasGASRunTag,
                `    window.vegasGASRunProxyHandler = {
      get(target, property, receiver) {
        if (target[property]) {
          return (...args) => target[property](...args);
        }
        target.fcb(new Error(property + " is not function."));
      },
    };
    window.vegasGASRun = class {
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
            if (response.status !== 200) {
              response.text().then((errorMessage) => {
                this.fcb("Mock function [" + func + "] failed with status " + response.status + ". Message: " + errorMessage);
              });
            }

            response.json().then((json) => this.scb(json));
          });
        } catch (error) {
          this.fcb(error);
        }
      }

      withSuccessHandler(callback) {
        return new Proxy(new vegasGASRun(callback, this.fcb), vegasGASRunProxyHandler);
      }
      withFailureHandler(callback) {
        return new Proxy(new vegasGASRun(this.scb, callback), vegasGASRunProxyHandler);
      }

      ${Object.keys(module)
        .map((func) => `${func}(...args) { this.__exec("${func}", ...args); }`)
        .join("\n      ")}
    };
    window.google = {
      script: {
        run: new Proxy(new vegasGASRun(null, null), vegasGASRunProxyHandler),
      },
    };`,
              );
              defaultTreeAdapter.appendChild(headTag, scriptVegasGASRunTag);

              const bodyTag = defaultTreeAdapter.createElement("body", html.NS.HTML, []);
              const divRootTag = defaultTreeAdapter.createElement("div", html.NS.HTML, [
                { name: "id", value: "root" },
              ]);
              defaultTreeAdapter.appendChild(bodyTag, divRootTag);
              const scriptModuleTag = defaultTreeAdapter.createElement("script", html.NS.HTML, [
                { name: "type", value: "module" },
                { name: "src", value: entry.entryPath },
              ]);
              defaultTreeAdapter.appendChild(bodyTag, scriptModuleTag);

              defaultTreeAdapter.appendChild(htmlTag, headTag);
              defaultTreeAdapter.appendChild(htmlTag, bodyTag);
              defaultTreeAdapter.appendChild(document, htmlTag);

              const transFormedHtml = await server.transformIndexHtml(
                url.href,
                serialize(document),
              );
              response.statusCode = 200;
              response.setHeader("Content-Type", "text/html");
              response.end(transFormedHtml);
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
            try {
              const targetFunc = context[functionName];
              if (typeof targetFunc !== "function") {
                throw new Error(`Function ${functionName} not found in mock server module.`);
              }

              const result = await targetFunc(...args);

              response.statusCode = 200;
              response.setHeader("Content-Type", "application/json");
              response.end(JSON.stringify(result ?? null));
              return;
            } catch (error: any) {
              response.statusCode = 500;
              response.setHeader("Content-Type", "text/plain");
              response.end(error.message);
              return;
            }
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
