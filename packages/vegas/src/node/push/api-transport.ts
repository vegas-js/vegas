import type { AppsScriptAccessTokenProvider } from "./access-token";
import type { AppsScriptPushRequest } from "./request";
import type { AppsScriptPushTransport } from "./transport";
import { createAppsScriptUpdateContentHttpRequest } from "./update-content";

interface CreateAppsScriptApiPushTransportOptions {
  readonly accessTokenProvider: AppsScriptAccessTokenProvider;
  readonly fetch?: typeof globalThis.fetch;
}

function requireAccessToken(accessToken: string): string {
  if (accessToken.trim().length === 0) {
    throw new Error("Apps Script access token is required.");
  }

  return accessToken;
}

function formatResponseStatus(response: Response): string {
  if (response.statusText.length === 0) {
    return String(response.status);
  }

  return `${response.status} ${response.statusText}`;
}

export function createAppsScriptApiPushTransport(
  options: CreateAppsScriptApiPushTransportOptions,
): AppsScriptPushTransport {
  const fetch = options.fetch ?? globalThis.fetch;

  return {
    async push(request: AppsScriptPushRequest): Promise<void> {
      const accessToken = requireAccessToken(await options.accessTokenProvider.getAccessToken());
      const httpRequest = createAppsScriptUpdateContentHttpRequest(request);

      const response = await fetch(httpRequest.url, {
        method: httpRequest.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(httpRequest.body),
      });

      if (response.ok) {
        return;
      }

      const responseBody = await response.text();
      const status = formatResponseStatus(response);

      if (responseBody.length === 0) {
        throw new Error(`Apps Script updateContent failed: ${status}`);
      }

      throw new Error(`Apps Script updateContent failed: ${status}\n${responseBody}`);
    },
  };
}
