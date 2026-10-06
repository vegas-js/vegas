import type { Connect } from "vite";

import type { ContentMimeType } from "../../runtime";
import type { ContentResponseRegistry } from "./content-response-registry";

export const CONTENT_RESPONSE_PATH_PREFIX = "/__vegas/content/";

const CONTENT_MIME_TYPES = {
  ATOM: "application/atom+xml",
  CSV: "text/csv",
  ICAL: "text/calendar",
  JAVASCRIPT: "application/javascript",
  JSON: "application/json",
  RSS: "application/rss+xml",
  TEXT: "text/plain",
  VCARD: "text/vcard",
  XML: "application/xml",
} satisfies Record<ContentMimeType, string>;

interface ContentResponseHttpHandlerOptions {
  readonly responses: Pick<ContentResponseRegistry, "consume">;
}

function setContentResponseHeaders(response: Parameters<Connect.NextHandleFunction>[1]): void {
  // Apps Script does not define these exact ContentService response headers as a public contract.
  // Vegas uses local defaults that preserve the intended browser behavior without claiming parity.
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "Mon, 01 Jan 1990 00:00:00 GMT");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
}

function resolveContentResponseId(pathname: string): string | undefined {
  if (!pathname.startsWith(CONTENT_RESPONSE_PATH_PREFIX)) {
    return undefined;
  }

  const encodedId = pathname.slice(CONTENT_RESPONSE_PATH_PREFIX.length);

  if (encodedId === "" || encodedId.includes("/")) {
    return "";
  }

  try {
    return decodeURIComponent(encodedId);
  } catch {
    return "";
  }
}

export function createContentResponsePath(id: string): string {
  return `${CONTENT_RESPONSE_PATH_PREFIX}${encodeURIComponent(id)}`;
}

export function resolveContentResponseMimeType(mimeType: ContentMimeType): string {
  return CONTENT_MIME_TYPES[mimeType];
}

export function createContentResponseHttpHandler(
  options: ContentResponseHttpHandlerOptions,
): Connect.NextHandleFunction {
  return (request, response, next) => {
    if (!request.url) {
      next();
      return;
    }

    const url = new URL(request.url, "http://localhost");
    const id = resolveContentResponseId(url.pathname);

    if (id === undefined) {
      next();
      return;
    }

    if (request.method !== "GET") {
      response.statusCode = 405;
      response.setHeader("Allow", "GET");
      response.end();
      return;
    }

    if (id === "") {
      response.statusCode = 404;
      response.end();
      return;
    }

    const output = options.responses.consume(id);

    if (output === undefined) {
      response.statusCode = 404;
      response.end();
      return;
    }

    setContentResponseHeaders(response);

    response.statusCode = 200;
    response.setHeader(
      "Content-Type",
      `${resolveContentResponseMimeType(output.mimeType)}; charset=utf-8`,
    );

    if (output.fileName !== null) {
      response.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(output.fileName)}`,
      );
    }

    response.end(output.content);
  };
}
