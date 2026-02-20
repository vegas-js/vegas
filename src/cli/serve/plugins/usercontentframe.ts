import vm from "node:vm";

import { defaultTreeAdapter, html, serialize } from "parse5";
import { Plugin } from "vite";

import { ProjectEntry } from "../../analyze";

export function userContentFrame(projectEntry: ProjectEntry): Plugin {
  const VIRTUAL_ID: string = "virtual:usercontentframe";

  return {
    name: "vite-plugin-usercontentframe",

    async configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url) {
          const rawContext: Record<string, any> = {};
          const module = await server.ssrLoadModule(VIRTUAL_ID);
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
            // if (request.headers["sec-fetch-dest"] !== "iframe") {
            //   const blankHtml = `<!DOCTYPE html><html><head><meta http-equiv="X-UA-Compatible" content="IE=edge"></head><body></body></html>\n`;

            //   response.statusCode = 200;
            //   response.setHeader("Content-Type", "text/html");
            //   response.end(blankHtml);
            //   return;
            // }
            const document = defaultTreeAdapter.createDocument();
            defaultTreeAdapter.setDocumentType(document, "html", "", "");
            const htmlTag = defaultTreeAdapter.createElement("html", html.NS.HTML, []);
            const headTag = defaultTreeAdapter.createElement("head", html.NS.HTML, []);
            const styleTag = defaultTreeAdapter.createElement("style", html.NS.HTML, []);
            defaultTreeAdapter.insertText(
              styleTag,
              "html, body, iframe {border: 0; display: block; height: 100%; margin: 0; padding: 0; width: 100%;}iframe#userHtmlFrame {overflow-y: scroll; -webkit-overflow-scrolling: touch;}",
            );
            defaultTreeAdapter.appendChild(headTag, styleTag);
            const scriptVegasModuleTag = defaultTreeAdapter.createElement("script", html.NS.HTML, [
              { name: "type", value: "module" },
            ]);
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
}
window.addEventListener("message", (event) => {
  const vegasGASRunProxyHandler = {
    get: (target, property, receiver) => {
      if (property === "withSuccessHandler") {
        return (callback) => new Proxy({
          successHandler: callback,
          failureHandler: target.failureHandler,

          __invoke: target.__invoke,
        }, vegasGASRunProxyHandler);
      } else if (property === "withFailureHandler") {
        return (callback) => new Proxy({
          successHandler: target.successHandler,
          failureHandler: callback,

          __invoke: target.__invoke,
        }, vegasGASRunProxyHandler);
      } else {
        return (...args) => target.__invoke(property, ...args);
      }
    },
  }
  const iframe = document.getElementById("userHtmlFrame");
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(event.data.userHtml);
  iframe.contentWindow.google = {
    script: {
      run: new Proxy({
        successHandler() {},
        failureHandler() {},

        __invoke(func, ...args) {
          try {
            fetch("/@vegas/" + func, {
              method: "POST",
              body: JSON.stringify(args),
              headers: { "Content-Type": "application/json" },
            }).then((response) => {
              if (response.status !== 200) {
                response.text().then((errorMessage) => {
                  this.failureHandler("Mock function [" + func + "()] failed with status " + response.status + ". Message: " + errorMessage);
                });
              }

              response.json().then((json) => this.successHandler(json));
            });
          } catch (error) {
            this.failureHandler(error);
          }
        },
      }, vegasGASRunProxyHandler),
    },
  };
  iframe.contentWindow.document.close();
});`,
            );
            defaultTreeAdapter.appendChild(headTag, scriptVegasModuleTag);
            defaultTreeAdapter.appendChild(htmlTag, headTag);

            const bodyTag = defaultTreeAdapter.createElement("body", html.NS.HTML, []);
            const iframeTag = defaultTreeAdapter.createElement("iframe", html.NS.HTML, [
              { name: "id", value: "userHtmlFrame" },
              {
                name: "allow",
                value:
                  "accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *",
              },
            ]);

            defaultTreeAdapter.appendChild(bodyTag, iframeTag);

            defaultTreeAdapter.appendChild(htmlTag, bodyTag);
            defaultTreeAdapter.appendChild(document, htmlTag);

            const transFormedHtml = await server.transformIndexHtml(url.href, serialize(document));
            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html");
            response.end(transFormedHtml);
            return;
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
