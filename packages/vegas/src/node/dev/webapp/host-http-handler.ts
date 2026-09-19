import type { Connect, ViteDevServer } from "vite";

import type { ArtifactStore } from "../../build";
import type { RuntimeBackend } from "../../runtime";
import type { BuildCoordinator } from "../build-coordinator";
import { createRuntimeProgram } from "../runtime-program";
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
  readonly artifacts: ArtifactStore;
  readonly runtime: RuntimeBackend;
}

export function createHostHttpHandler(options: HostHttpHandlerOptions): Connect.NextHandleFunction {
  const { server, builds, sessions, artifacts, runtime } = options;

  return async (request, response, next) => {
    try {
      await builds.waitForIdle();

      if (request.url) {
        const scheme = server.config.server.https ? "https" : "http";
        const url = new URL(request.url, `${scheme}://${request.headers.host}`);
        url.port = String(Number.parseInt(url.port) + 1);

        if (url.pathname === "/") {
          const basePath = server.config.mode === "production" ? "/exec" : "/dev";
          response.statusCode = 307;
          response.setHeader("Location", `${basePath}${url.search}`);
          response.end();
          return;
        }

        if (parseWebAppPath(url.pathname)) {
          if (request.method === "GET") {
            const doGetEvent = createAppsScriptDoGetEvent(url);
            const program = createRuntimeProgram(artifacts);

            const result = (await runtime.execute({
              program,
              functionName: "doGet",
              args: [doGetEvent],
            })) as AppsScriptDoGetResult;

            const sessionId = sessions.issue();
            const html = createHostHtml(url, result, sessionId);
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
            const program = createRuntimeProgram(artifacts);

            const result = (await runtime.execute({
              program,
              functionName: "doPost",
              args: [doPostEvent],
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
