import { AppsScriptRemoteServiceError } from "../../infrastructure/google/apps-script-remote-service-error";
import { formatGoogleHttpError } from "../../infrastructure/google/error-response";
import {
  createGoogleHttpRequestSignal,
  type GoogleHttpRequestLifetimeOptions,
} from "../../infrastructure/google/http-request";
import type { AppsScriptCredential } from "../credential";
import {
  GOOGLE_OAUTH_TOKEN_URL,
  parseGoogleOAuthAccessToken,
  parseGoogleOAuthTokenResponse,
} from "../google-oauth/token-response";
import type {
  AppsScriptAccessTokenRefresher,
  AppsScriptAccessTokenRefreshRequest,
  AppsScriptRefreshedAccessToken,
} from "./index";

interface CreateGoogleAppsScriptAccessTokenRefresherOptions extends GoogleHttpRequestLifetimeOptions {
  readonly fetch?: typeof globalThis.fetch;
  readonly now?: () => number;
}

function combineAbortSignals(
  configuredSignal: AbortSignal | undefined,
  requestSignal: AbortSignal | undefined,
): AbortSignal | undefined {
  if (configuredSignal === undefined) {
    return requestSignal;
  }
  if (requestSignal === undefined) {
    return configuredSignal;
  }

  return AbortSignal.any([configuredSignal, requestSignal]);
}

export function createGoogleAppsScriptAccessTokenRefresher(
  options: CreateGoogleAppsScriptAccessTokenRefresherOptions = {},
): AppsScriptAccessTokenRefresher {
  const fetch = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;

  return {
    async refresh(
      credential: AppsScriptCredential,
      request: AppsScriptAccessTokenRefreshRequest = {},
    ): Promise<AppsScriptRefreshedAccessToken> {
      const body = new URLSearchParams({
        client_id: credential.clientId,
        client_secret: credential.clientSecret,
        refresh_token: credential.refreshToken,
        grant_type: "refresh_token",
      });
      const signal = combineAbortSignals(options.signal, request.signal);

      const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        signal: createGoogleHttpRequestSignal({
          signal,
          requestTimeoutMs: options.requestTimeoutMs,
        }),
      });

      const responseBody = await response.text();

      if (!response.ok) {
        throw new AppsScriptRemoteServiceError(
          `Google OAuth token refresh failed: ${formatGoogleHttpError(response, responseBody)}`,
        );
      }

      return parseGoogleOAuthAccessToken(parseGoogleOAuthTokenResponse(responseBody), now());
    },
  };
}
