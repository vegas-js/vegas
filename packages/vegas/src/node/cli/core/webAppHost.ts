import type { IncomingMessage, ServerResponse } from "node:http";

import type { WebAppTriggerRequest } from "../../runtime/triggers/webApp";
import { getWebAppTriggerRequestRejection } from "../../runtime/triggers/webAppAdmission";
import type { WebAppHtmlResult, WebAppResult } from "../../runtime/triggers/webAppResult";
import {
  createUnsupportedWebAppResultHtml,
  projectRejectedWebAppRequestHttpResponse,
  projectWebAppTextHttpResponse,
} from "./webAppResponse";

export interface HandleWebAppHttpRequestOptions {
  readonly url: URL;

  readonly request: IncomingMessage;

  readonly response: ServerResponse;

  readonly execute: (request: WebAppTriggerRequest) => Promise<WebAppResult>;

  readonly renderHtml: (url: URL, result: WebAppHtmlResult) => Promise<string>;
}

function isWebAppPath(pathname: string): boolean {
  return /^\/(?:exec|dev)(?:\/|$)/.test(pathname);
}

function getPathInfo(pathname: string): string | undefined {
  const trimmedPath = pathname.replace(/^\/(?:exec|dev)/, "");

  return trimmedPath.length > 1 ? trimmedPath.slice(1) : undefined;
}

function getContentType(request: IncomingMessage): string | undefined {
  const value = request.headers["content-type"];

  return Array.isArray(value) ? value[0] : value;
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request as AsyncIterable<unknown>) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));

      continue;
    }

    if (chunk instanceof Uint8Array) {
      chunks.push(Buffer.from(chunk));

      continue;
    }

    throw new TypeError("Unsupported HTTP request body chunk");
  }

  return Buffer.concat(chunks).toString("utf8");
}

function writeRejectedResponse(response: ServerResponse): void {
  const projected = projectRejectedWebAppRequestHttpResponse();

  response.statusCode = projected.statusCode;

  response.statusMessage = projected.statusMessage;

  response.setHeader("Content-Type", projected.contentType);

  response.end(projected.body);
}

async function writeWebAppResult(
  url: URL,
  response: ServerResponse,
  result: WebAppResult,
  renderHtml: HandleWebAppHttpRequestOptions["renderHtml"],
): Promise<void> {
  switch (result.kind) {
    case "html": {
      const html = await renderHtml(url, result);

      response.statusCode = 200;

      response.setHeader("Content-Type", "text/html; charset=utf-8");

      if (result.xFrameOptionsMode !== null && result.xFrameOptionsMode !== undefined) {
        response.setHeader("X-Frame-Options", result.xFrameOptionsMode);
      }

      response.end(html);

      return;
    }

    case "text": {
      const projected = projectWebAppTextHttpResponse(result);

      response.statusCode = projected.statusCode;

      response.setHeader("Content-Type", projected.contentType);

      if (projected.contentDisposition !== null) {
        response.setHeader("Content-Disposition", projected.contentDisposition);
      }

      response.end(projected.body ?? "");

      return;
    }

    case "unsupported":
      response.statusCode = 200;

      response.setHeader("Content-Type", "text/html; charset=utf-8");

      response.end(createUnsupportedWebAppResultHtml());

      return;
  }
}

export async function handleWebAppHttpRequest({
  url,
  request,
  response,
  execute,
  renderHtml,
}: HandleWebAppHttpRequestOptions): Promise<boolean> {
  if (!isWebAppPath(url.pathname)) {
    return false;
  }

  const queryString = url.search.length > 1 ? url.search.slice(1) : "";

  const pathInfo = getPathInfo(url.pathname);

  let webAppRequest: WebAppTriggerRequest;

  switch (request.method) {
    case "GET":
      webAppRequest = {
        method: "GET",

        queryString,

        ...(pathInfo === undefined
          ? {}
          : {
              pathInfo,
            }),
      };

      break;

    case "POST": {
      const body = await readRequestBody(request);

      const contentType = getContentType(request);

      webAppRequest = {
        method: "POST",

        queryString,

        body,

        ...(pathInfo === undefined
          ? {}
          : {
              pathInfo,
            }),

        ...(contentType === undefined
          ? {}
          : {
              contentType,
            }),
      };

      break;
    }

    default:
      return false;
  }

  if (getWebAppTriggerRequestRejection(webAppRequest) !== undefined) {
    writeRejectedResponse(response);

    return true;
  }

  const result = await execute(webAppRequest);

  await writeWebAppResult(url, response, result, renderHtml);

  return true;
}
