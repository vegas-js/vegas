import type { WebAppTextMimeType, WebAppTextResult } from "../../runtime/triggers";

const CONTENT_TYPES = {
  CSV: "text/csv; charset=utf-8",

  ICAL: "text/calendar; charset=utf-8",

  JAVASCRIPT: "text/javascript; charset=utf-8",

  JSON: "application/json; charset=utf-8",

  TEXT: "text/plain; charset=utf-8",

  VCARD: "text/vcard; charset=utf-8",
} satisfies Record<WebAppTextMimeType, string>;

export interface WebAppTextHttpResponse {
  readonly statusCode: 200;

  readonly contentType: string;

  readonly contentDisposition: string | null;

  readonly body: string | null;
}

export interface RejectedWebAppRequestHttpResponse {
  readonly statusCode: 400;

  readonly statusMessage: "Bad Request";

  readonly contentType: "text/html; charset=utf-8";

  readonly body: string;
}

function escapeQuotedFileName(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function encodeRfc5987Value(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function createContentDisposition(fileName: string | null): string | null {
  if (fileName === null) {
    return null;
  }

  return [
    "attachment",
    `filename="${escapeQuotedFileName(fileName)}"`,
    `filename*=UTF-8''${encodeRfc5987Value(fileName)}`,
  ].join("; ");
}

export function projectRejectedWebAppRequestHttpResponse(): RejectedWebAppRequestHttpResponse {
  return {
    statusCode: 400,

    statusMessage: "Bad Request",

    contentType: "text/html; charset=utf-8",

    body: [
      "<!doctype html>",
      "<html>",
      "<head>",
      '<meta charset="utf-8">',
      "<title>Bad Request</title>",
      "</head>",
      "<body>",
      "<h1>Bad Request</h1>",
      "</body>",
      "</html>",
    ].join(""),
  };
}

export function projectWebAppTextHttpResponse(result: WebAppTextResult): WebAppTextHttpResponse {
  return {
    statusCode: 200,

    contentType: CONTENT_TYPES[result.mimeType],

    contentDisposition: createContentDisposition(result.fileName),

    body: result.content,
  };
}

export function createUnsupportedWebAppResultHtml(): string {
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    "<title>Error</title>",
    "</head>",
    "<body>",
    "<p>",
    "The script completed, but the returned value is not a supported web app return type.",
    "</p>",
    "</body>",
    "</html>",
  ].join("");
}
