import type { ReferenceWebAppExecutor, ReferenceWebAppRequest } from "../core/types";

const MAX_ERROR_BODY_LENGTH = 2_000;

function normalizeWebAppUrl(value: string): string {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("Reference web app URL must use HTTPS");
  }

  if (url.search !== "" || url.hash !== "") {
    throw new Error("Reference web app URL must not contain a query string or fragment");
  }

  url.pathname = url.pathname.replace(/\/+$/, "");

  if (!url.pathname.endsWith("/exec") && !url.pathname.endsWith("/dev")) {
    throw new Error("Reference web app URL must end with /exec or /dev");
  }

  return url.toString();
}

function buildRequestUrl(baseUrl: string, request: ReferenceWebAppRequest): string {
  let url = baseUrl;

  if (request.pathInfo !== undefined) {
    if (request.pathInfo.startsWith("/")) {
      throw new Error("Reference web app pathInfo must not start with /");
    }

    if (request.pathInfo.includes("?") || request.pathInfo.includes("#")) {
      throw new Error("Reference web app pathInfo must not contain ? or #");
    }

    url += `/${request.pathInfo}`;
  }

  if (request.queryString !== undefined) {
    if (request.queryString.startsWith("?")) {
      throw new Error("Reference web app queryString must not start with ?");
    }

    url += `?${request.queryString}`;
  }

  return url;
}

function formatErrorBody(body: string): string {
  if (body.length <= MAX_ERROR_BODY_LENGTH) {
    return body;
  }

  return `${body.slice(0, MAX_ERROR_BODY_LENGTH)}…`;
}

class WebAppReferenceClient implements ReferenceWebAppExecutor {
  readonly #baseUrl: string;

  constructor(webAppUrl: string) {
    this.#baseUrl = normalizeWebAppUrl(webAppUrl);
  }

  async execute(request: ReferenceWebAppRequest): Promise<unknown> {
    const url = buildRequestUrl(this.#baseUrl, request);

    const response = await fetch(url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const body = await response.text();

    if (!response.ok) {
      throw new Error(
        `Apps Script web app request failed: ${response.status} ${response.statusText}: ${formatErrorBody(body)}`,
      );
    }

    if (request.responseMode === "text") {
      return body;
    }

    try {
      return JSON.parse(body) as unknown;
    } catch (error) {
      throw new Error("Apps Script web app response was not valid JSON", {
        cause: error,
      });
    }
  }
}

export function createWebAppReferenceClient(webAppUrl: string): ReferenceWebAppExecutor {
  return new WebAppReferenceClient(webAppUrl);
}
