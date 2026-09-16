import type {
  AppsScriptAccessTokenRefresher,
  AppsScriptRefreshedAccessToken,
} from "./access-token";
import type { AppsScriptCredential } from "./credential";
import { AppsScriptRemoteServiceError } from "./error";
import { formatGoogleHttpError } from "./google-error-response";

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface CreateGoogleAppsScriptAccessTokenRefresherOptions {
  readonly fetch?: typeof globalThis.fetch;
  readonly now?: () => number;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function parseRefreshedAccessToken(content: string, now: number): AppsScriptRefreshedAccessToken {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid Google OAuth token response.");
  }

  const response = objectValue(parsed);

  if (!response) {
    throw new Error("Invalid Google OAuth token response.");
  }

  const accessToken = response.access_token;
  const expiresIn = response.expires_in;

  if (
    typeof accessToken !== "string" ||
    accessToken.trim().length === 0 ||
    typeof expiresIn !== "number" ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0
  ) {
    throw new Error("Invalid Google OAuth token response.");
  }

  const expiryDate = now + expiresIn * 1000;

  if (!Number.isFinite(expiryDate)) {
    throw new Error("Invalid Google OAuth token response.");
  }

  return {
    accessToken,
    expiryDate,
  };
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

      return parseRefreshedAccessToken(responseBody, now());
    },
  };
}
