import type { AppsScriptAccessTokenProvider } from "./access-token";
import { AppsScriptRemoteServiceError } from "./error";
import { formatGoogleHttpError } from "./google-error-response";
import {
  createGoogleHttpRequestSignal,
  type GoogleHttpRequestLifetimeOptions,
} from "./google-http-request";
import type { AppsScriptPushRequest } from "./request";
import type { AppsScriptPushTransport } from "./transport";
import { createAppsScriptUpdateContentHttpRequest } from "./update-content";

interface CreateAppsScriptApiPushTransportOptions extends GoogleHttpRequestLifetimeOptions {
  readonly accessTokenProvider: AppsScriptAccessTokenProvider;
  readonly fetch?: typeof globalThis.fetch;
}

function requireAccessToken(accessToken: string): string {
  const normalizedAccessToken = accessToken.trim();

  if (normalizedAccessToken.length === 0) {
    throw new Error("Apps Script access token is required.");
  }

  return normalizedAccessToken;
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
        signal: createGoogleHttpRequestSignal(options),
      });

      if (response.ok) {
        return;
      }

      const responseBody = await response.text();

      throw new AppsScriptRemoteServiceError(
        `Apps Script updateContent failed: ${formatGoogleHttpError(response, responseBody)}`,
      );
    },
  };
}
