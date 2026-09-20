import type { Connect, ViteDevServer } from "vite";

import type { InvocationContext, RuntimeBackend } from "../../runtime";
import type { BuildCoordinator } from "../build-coordinator";
import { createAppsScriptDoGetEvent, createAppsScriptDoPostEvent } from "./event";
import { createHostHtml, type AppsScriptDoGetResult } from "./host-html";
import {
  createAppsScriptDoPostHttpResponse,
  parseWebAppPath,
  readRequestBody,
  resolveAppsScriptXFrameOptionsHeader,
  type AppsScriptDoPostResult,
} from "./http";
import type { WebAppSessionRegistry } from "./session-registry";

interface HostHttpHandlerOptions {
  readonly server: ViteDevServer;
  readonly builds: Pick<BuildCoordinator, "waitForIdle">;
  readonly sessions: Pick<WebAppSessionRegistry, "issue">;
  readonly runtime: RuntimeBackend;
  readonly userContentPort: number;
}

export function createHostHttpHandler(options: HostHttpHandlerOptions): Connect.NextHandleFunction {
  const { server, builds, sessions, runtime, userContentPort } = options;

  return async (request, response, next) => {
    try {
      await builds.waitForIdle();

      if (request.url) {
        const scheme = server.config.server.https ? "https" : "http";
        const url = new URL(request.url, `${scheme}://${request.headers.host}`);

        if (url.pathname === "/") {
          const basePath = server.config.mode === "production" ? "/exec" : "/dev";
          response.statusCode = 307;
          response.setHeader("Location", `${basePath}${url.search}`);
          response.end();
          return;
        }

        if (parseWebAppPath(url.pathname)) {
          const context: InvocationContext = {
            webApp: true,
            userAgent: request.headers["user-agent"] ?? null,
          };

          if (request.method === "GET") {
            const doGetEvent = createAppsScriptDoGetEvent(url);

            const result = (await runtime.execute({
              functionName: "doGet",
              args: [doGetEvent],
              context,
            })) as AppsScriptDoGetResult;

            const sessionId = sessions.issue();
            const userContentUrl = new URL(url.href);
            userContentUrl.port = String(userContentPort);
            const html = createHostHtml(userContentUrl, result, sessionId);
            const transformedHtml = await server.transformIndexHtml(url.href, html);

            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html; charset=utf-8");

            const xFrameOptionsHeader = resolveAppsScriptXFrameOptionsHeader(
              result.xFrameOptionsMode,
            );
            if (xFrameOptionsHeader !== undefined) {
              response.setHeader("X-Frame-Options", xFrameOptionsHeader);
            }

            response.end(transformedHtml);
            return;
          }

          if (request.method === "POST") {
            const body = await readRequestBody(request);
            const doPostEvent = createAppsScriptDoPostEvent(
              url,
              body,
              request.headers["content-type"],
            );

            const result = (await runtime.execute({
              functionName: "doPost",
              args: [doPostEvent],
              context,
            })) as AppsScriptDoPostResult;

            const httpResponse = createAppsScriptDoPostHttpResponse(result);

            response.statusCode = 200;
            response.setHeader("Content-Type", httpResponse.contentType);
            response.end(httpResponse.body);
            return;
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
