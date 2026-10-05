import type { Connect, ViteDevServer } from "vite";

import type { WebAppBuildBarrier } from "../../webapp/build-barrier";
import type { WebAppSessionRegistry } from "../../webapp/session-registry";
import {
  createBlankUserContentHtml,
  createUserContentPanelHtml,
} from "../../webapp/user-content-html";

interface UserContentHttpHandlerOptions {
  readonly server: ViteDevServer;
  readonly builds: WebAppBuildBarrier;
  readonly sessions: Pick<WebAppSessionRegistry, "claim">;
  readonly hostPort: number;
}

export function createUserContentHttpHandler(
  options: UserContentHttpHandlerOptions,
): Connect.NextHandleFunction {
  const { server, builds, sessions, hostPort } = options;

  return async (request, response, next) => {
    try {
      await builds.waitForIdle();

      if (request.url) {
        const scheme = server.config.server.https ? "https" : "http";
        const url = new URL(request.url, `${scheme}://${request.headers.host}`);

        if (url.pathname === "/blank") {
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(createBlankUserContentHtml());
          return;
        }

        if (url.pathname === "/userCodeAppPanel") {
          const requestedSessionId = url.searchParams.get("sessionId");
          const sessionId =
            requestedSessionId && sessions.claim(requestedSessionId) ? requestedSessionId : "";

          const hostOrigin = `${url.protocol}//${url.hostname}:${hostPort}`;

          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(createUserContentPanelHtml(hostOrigin, sessionId));
          return;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
