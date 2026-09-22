import type { Connect, ViteDevServer } from "vite";

import {
  CONTENT_MIME_TYPE,
  type ContentMimeType,
  type InvocationContext,
  type RuntimeBackend,
  type TextOutputSnapshot,
} from "../../runtime";
import type { BuildCoordinator } from "../build-coordinator";
import { createContentResponsePath } from "./content-response-http-handler";
import type { ContentResponseRegistry } from "./content-response-registry";
import { createAppsScriptDoGetEvent, createAppsScriptDoPostEvent } from "./event";
import { createHostHtml, type AppsScriptDoGetResult } from "./host-html";
import { parseWebAppPath, readRequestBody, resolveAppsScriptXFrameOptionsHeader } from "./http";
import type { WebAppSessionRegistry } from "./session-registry";

interface HostHttpHandlerOptions {
  readonly server: ViteDevServer;
  readonly builds: Pick<BuildCoordinator, "waitForIdle">;
  readonly contentResponses: Pick<ContentResponseRegistry, "issue">;
  readonly sessions: Pick<WebAppSessionRegistry, "issue">;
  readonly runtime: RuntimeBackend;
  readonly userContentPort: number;
}

const HTTP_CLIENT_DISCONNECTED_MESSAGE = "Vegas HTTP client disconnected.";
const CONTENT_MIME_TYPES = new Set<string>(Object.values(CONTENT_MIME_TYPE));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isContentMimeType(value: unknown): value is ContentMimeType {
  return typeof value === "string" && CONTENT_MIME_TYPES.has(value);
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

function requireAppsScriptTextOutput(value: unknown, functionName: string): TextOutputSnapshot {
  if (
    !isRecord(value) ||
    value.kind !== "text" ||
    !isRecord(value.output) ||
    typeof value.output.content !== "string" ||
    (value.output.fileName !== null && typeof value.output.fileName !== "string") ||
    !isContentMimeType(value.output.mimeType)
  ) {
    throw new Error(`Invalid ${functionName} result from Runtime.`);
  }

  return {
    content: value.output.content,
    fileName: value.output.fileName,
    mimeType: value.output.mimeType,
  };
}

export function createHostHttpHandler(options: HostHttpHandlerOptions): Connect.NextHandleFunction {
  const { server, builds, contentResponses, sessions, runtime, userContentPort } = options;

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
          // Apps Script does not define this deployment-root redirect.
          // Vegas maps local "/" requests to the active web-app route as a convenience.
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

          const runtimeResult = await runtime.execute({
            functionName,
            args,
            context,
            signal: controller.signal,
          });

          if (controller.signal.aborted) {
            return;
          }

          if (isRecord(runtimeResult) && runtimeResult.kind === "text") {
            const output = requireAppsScriptTextOutput(runtimeResult, functionName);
            const responseId = contentResponses.issue(output);
            const contentUrl = new URL(url.origin);
            contentUrl.port = String(userContentPort);
            contentUrl.pathname = createContentResponsePath(responseId);

            // Apps Script documents the one-time ContentService redirect but not its exact status.
            // Vegas uses 302 for the Local Runtime transport.
            response.statusCode = 302;
            response.setHeader("Location", contentUrl.href);
            response.end();
            return;
          }

          const result = requireAppsScriptHtmlOutput(runtimeResult, functionName);
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
