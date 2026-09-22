import type { Connect, ViteDevServer } from "vite";

import type { InvocationContext, RuntimeBackend } from "../../runtime";
import type { BuildCoordinator } from "../build-coordinator";
import { createAppsScriptDoGetEvent, createAppsScriptDoPostEvent } from "./event";
import { createHostHtml, type AppsScriptDoGetResult } from "./host-html";
import { parseWebAppPath, readRequestBody, resolveAppsScriptXFrameOptionsHeader } from "./http";
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

function requireAppsScriptHtmlOutput(value: unknown, functionName: string): AppsScriptDoGetResult {
  if (
    !isRecord(value) ||
    value.kind !== "html" ||
    !isRecord(value.output) ||
    typeof value.output.content !== "string" ||
    typeof value.output.faviconUrl !== "string" ||
    typeof value.output.title !== "string" ||
    !Array.isArray(value.output.metaTags) ||
    (value.output.xFrameOptionsMode !== "DEFAULT" && value.output.xFrameOptionsMode !== "ALLOWALL")
  ) {
    if (isRecord(value) && value.kind === "text") {
      throw new Error("ContentService TextOutput redirect is not implemented yet.");
    }

    throw new Error(`Invalid ${functionName} result from Runtime.`);
  }

  const metaTags = value.output.metaTags.map((metaTag) => {
    if (
      !isRecord(metaTag) ||
      typeof metaTag.name !== "string" ||
      typeof metaTag.content !== "string"
    ) {
      throw new Error(`Invalid ${functionName} result from Runtime.`);
    }

    return {
      name: metaTag.name,
      content: metaTag.content,
    };
  });

  return {
    content: value.output.content,
    faviconUrl: value.output.faviconUrl,
    metaTags,
    title: value.output.title,
    xFrameOptionsMode: value.output.xFrameOptionsMode,
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
          let functionName: "doGet" | "doPost";
          let args: readonly unknown[];

          if (request.method === "GET") {
            functionName = "doGet";
            args = [createAppsScriptDoGetEvent(url)];
          } else if (request.method === "POST") {
            const body = await readRequestBody(request);

            if (controller.signal.aborted) {
              return;
            }

            functionName = "doPost";
            args = [createAppsScriptDoPostEvent(url, body, request.headers["content-type"])];
          } else {
            next();
            return;
          }

          const result = requireAppsScriptHtmlOutput(
            await runtime.execute({
              functionName,
              args,
              context,
              signal: controller.signal,
            }),
            functionName,
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
