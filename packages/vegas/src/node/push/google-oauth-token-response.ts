import type { AppsScriptRefreshedAccessToken } from "./access-token";

export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

export function parseGoogleOAuthTokenResponse(content: string): Record<string, unknown> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid Google OAuth token response.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Invalid Google OAuth token response.");
  }

  return parsed as Record<string, unknown>;
}

export function parseGoogleOAuthAccessToken(
  response: Readonly<Record<string, unknown>>,
  now: number,
): AppsScriptRefreshedAccessToken {
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
