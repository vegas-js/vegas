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

const HTTP_CLIENT_DISCONNECTED_MESSAGE = "Vegas HTTP client disconnected.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireAppsScriptDoGetResult(value: unknown): AppsScriptDoGetResult {
  if (
    !isRecord(value) ||
    typeof value.content !== "string" ||
    typeof value.faviconUrl !== "string" ||
    typeof value.title !== "string" ||
    !Array.isArray(value.metaTags) ||
    (value.xFrameOptionsMode !== "DEFAULT" && value.xFrameOptionsMode !== "ALLOWALL")
  ) {
    throw new Error("Invalid doGet result from Runtime.");
  }

  const metaTags = value.metaTags.map((metaTag) => {
    if (
      !isRecord(metaTag) ||
      typeof metaTag.name !== "string" ||
      typeof metaTag.content !== "string"
    ) {
      throw new Error("Invalid doGet result from Runtime.");
    }

    return {
      name: metaTag.name,
      content: metaTag.content,
    };
  });

  return {
    content: value.content,
    faviconUrl: value.faviconUrl,
    metaTags,
    title: value.title,
    xFrameOptionsMode: value.xFrameOptionsMode,
  };
}

function requireAppsScriptDoPostResult(value: unknown): AppsScriptDoPostResult {
  if (!isRecord(value) || typeof value.mimeType !== "string" || typeof value.content !== "string") {
    throw new Error("Invalid doPost result from Runtime.");
  }

  return {
    mimeType: value.mimeType,
    content: value.content,
  };
}

export function createHostHttpHandler(options: HostHttpHandlerOptions): Connect.NextHandleFunction {
  const { server, builds, sessions, runtime, userContentPort } = options;

  return async (request, response, next) => {
    const controller = new AbortController();
    const handleResponseClose = (): void => {
      controller.abort(new Error(HTTP_CLIENT_DISCONNECTED_MESSAGE));
    };

    response.once("close", handleResponseClose);

    try {
      await builds.waitForIdle();

      if (controller.signal.aborted) {
        return;
      }

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

            const result = requireAppsScriptDoGetResult(
              await runtime.execute({
                functionName: "doGet",
                args: [doGetEvent],
                context,
                signal: controller.signal,
              }),
            );

            if (controller.signal.aborted) {
              return;
            }

            const sessionId = sessions.issue();
            const userContentUrl = new URL(url.href);
            userContentUrl.port = String(userContentPort);
            const html = createHostHtml(userContentUrl, result, sessionId);
            const transformedHtml = await server.transformIndexHtml(url.href, html);

            if (controller.signal.aborted) {
              return;
            }

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

            if (controller.signal.aborted) {
              return;
            }

            const doPostEvent = createAppsScriptDoPostEvent(
              url,
              body,
              request.headers["content-type"],
            );

            const result = requireAppsScriptDoPostResult(
              await runtime.execute({
                functionName: "doPost",
                args: [doPostEvent],
                context,
                signal: controller.signal,
              }),
            );

            if (controller.signal.aborted) {
              return;
            }

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
      if (!controller.signal.aborted) {
        next(error);
      }
    } finally {
      response.off("close", handleResponseClose);
    }
  };
}
