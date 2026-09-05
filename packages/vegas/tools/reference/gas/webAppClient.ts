import type {
  AccessTokenProvider,
  ReferenceWebAppExecutor,
  ReferenceWebAppRequest,
} from "../core/types";

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

  if (!url.pathname.endsWith("/exec")) {
    throw new Error("Reference web app URL must end with /exec");
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
  readonly #accessTokenProvider: AccessTokenProvider | undefined;

  constructor(webAppUrl: string, accessTokenProvider?: AccessTokenProvider) {
    this.#baseUrl = normalizeWebAppUrl(webAppUrl);
    this.#accessTokenProvider = accessTokenProvider;
  }

  async execute(request: ReferenceWebAppRequest): Promise<unknown> {
    const url = buildRequestUrl(this.#baseUrl, request);

    let headers: HeadersInit | undefined = request.headers;

    if (request.authentication === "oauth") {
      if (this.#accessTokenProvider === undefined) {
        throw new Error("OAuth-authenticated web app request requires an access token provider");
      }

      const authenticatedHeaders = new Headers(request.headers);

      if (authenticatedHeaders.has("Authorization")) {
        throw new Error(
          "OAuth-authenticated web app request must not provide an Authorization header",
        );
      }

      const accessToken = await this.#accessTokenProvider.getAccessToken();

      authenticatedHeaders.set("Authorization", `Bearer ${accessToken}`);

      headers = authenticatedHeaders;
    }

    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.body,
    });

    if (request.responseMode === "http") {
      return {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        redirected: response.redirected,
        contentType: response.headers.get("content-type"),
      };
    }

    const body = await response.text();

    if (request.responseMode === "http-text") {
      return {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        redirected: response.redirected,
        contentType: response.headers.get("content-type"),
        body,
      };
    }

    if (request.responseMode === "http-details") {
      return {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        redirected: response.redirected,

        contentType: response.headers.get("content-type"),

        contentDisposition: response.headers.get("content-disposition"),

        body,
      };
    }

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
      throw new Error(
        [
          "Apps Script web app response was not valid JSON",
          `requestUrl=${url}`,
          `responseUrl=${response.url || "<empty>"}`,
          `status=${response.status} ${response.statusText}`,
          `contentType=${response.headers.get("content-type") ?? "<missing>"}`,
          `body=${formatErrorBody(body)}`,
        ].join(": "),
        {
          cause: error,
        },
      );
    }
  }
}

export function createWebAppReferenceClient(
  webAppUrl: string,
  accessTokenProvider?: AccessTokenProvider,
): ReferenceWebAppExecutor {
  return new WebAppReferenceClient(webAppUrl, accessTokenProvider);
}
