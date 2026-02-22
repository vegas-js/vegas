import { defaultTreeAdapter, html, serialize } from "parse5";
import { Plugin } from "vite";

export function userContentFrame(): Plugin {
  return {
    name: "vite-plugin-usercontentframe",

    async configureServer(server) {
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
          if (url.pathname === "/blank") {
            const blankHtml = `<!DOCTYPE html><html><head><meta http-equiv="X-UA-Compatible" content="IE=edge"></head><body></body></html>\n`;
            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html");
            response.end(blankHtml);
            return;
          } else if (url.pathname === "/userCodeAppPanel") {
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
            const scriptVegasModuleTag = defaultTreeAdapter.createElement(
              "script",
              html.NS.HTML,
              [],
            );
            defaultTreeAdapter.insertText(
              scriptVegasModuleTag,
              `window.vegas = {
  requestMap: new Map(),
};
window.addEventListener("message", (event) => {
  if (event.data.type === "vegas:gasinit") {
    window.vegas.host = event.data.payload.host;
    const iframe = document.getElementById("userHtmlFrame");
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(event.data.payload.serverData.userHtml);
    if (!iframe.contentWindow.google) {
      iframe.contentWindow.google = {
        script: {
          run: {
            __proto__: new Proxy({
              withSuccessHandler: (callback) => {},
              withFailureHandler: (callback) => {},
            }, {
              get: (target, property, receiver) => {
                if (property === "withSuccessHandler") {
                  return (callback) => {
                    return {
                      successHandler: callback,
                      __proto__: receiver,
                    };
                  };
                } else if (property === "withFailureHandler") {
                  return (callback) => {
                    return {
                      failureHandler: callback,
                      __proto__: receiver,
                    };
                  };
                } else {
                  return (...args) => {
                    let requestId = 0;
                    do { requestId = Math.floor(Math.random() * 99999); } while (window.vegas.requestMap.has(requestId));
                    window.vegas.requestMap.set(requestId, receiver);
                    window.parent.postMessage({ type: "vegas:gascall", payload: { id: requestId, func: property, args: JSON.stringify(args) }}, window.vegas.host);
                  };
                }
              },
            }),
          },
        },
      };
    }
    iframe.contentWindow.document.close();
  } else if (event.data.type === "vegas:gasreturn") {
    const iframe = document.getElementById("userHtmlFrame");
    const gasRun = window.vegas.requestMap.get(event.data.payload.id);
    if (event.data.payload.status === "ok") {
      gasRun.successHandler(JSON.parse(event.data.payload.result));
    } else if (event.data.payload.status === "err") {
      gasRun.failureHandler(event.data.payload.message);
    }
    window.vegas.requestMap.delete(event.data.payload.id);
  }
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
              { name: "src", value: "/blank" },
            ]);

            defaultTreeAdapter.appendChild(bodyTag, iframeTag);

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
