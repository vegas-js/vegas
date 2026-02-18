import { Plugin } from "vite";

export function hostFrame(): Plugin {
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
            response.statusCode = 301;
            response.setHeader("Location", `${basePath}${url.search}`);
            response.end();
            return;
          } else if (/^\/(exec|dev)/.test(url.pathname)) {
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
  <iframe
    id="sandboxFrame"
    title="sample"
    allow="accelerometer *; ambient-light-sensor *; autoplay *; camera *; clipboard-read *; clipboard-write *; encrypted-media *; fullscreen *; geolocation *; gyroscope *; local-network-access *; magnetometer *; microphone *; midi *; payment *; picture-in-picture *; screen-wake-lock *; speaker *; sync-xhr *; usb *; vibrate *; vr *; web-share *"
    sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation allow-storage-access-by-user-activation"
    src="${contentBaseUrl}/userCodeAppPanel"
  >
</iframe>
</body>
</html>`;

            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html");
            response.end(iframeHtml);
            return;
          }
        }
        next();
      });
    },
  };
}
