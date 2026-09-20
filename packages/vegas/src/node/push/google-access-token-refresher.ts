import type {
  AppsScriptAccessTokenRefresher,
  AppsScriptRefreshedAccessToken,
} from "./access-token";
import type { AppsScriptCredential } from "./credential";
import { AppsScriptRemoteServiceError } from "./error";
import { formatGoogleHttpError } from "./google-error-response";
import {
  GOOGLE_OAUTH_TOKEN_URL,
  parseGoogleOAuthAccessToken,
  parseGoogleOAuthTokenResponse,
} from "./google-oauth-token-response";

interface CreateGoogleAppsScriptAccessTokenRefresherOptions {
  readonly fetch?: typeof globalThis.fetch;
  readonly now?: () => number;
}

export function createGoogleAppsScriptAccessTokenRefresher(
  options: CreateGoogleAppsScriptAccessTokenRefresherOptions = {},
): AppsScriptAccessTokenRefresher {
  const fetch = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;

  return {
    async refresh(credential: AppsScriptCredential): Promise<AppsScriptRefreshedAccessToken> {
      const body = new URLSearchParams({
        client_id: credential.clientId,
        client_secret: credential.clientSecret,
        refresh_token: credential.refreshToken,
        grant_type: "refresh_token",
      });

      const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
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
