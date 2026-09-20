import { AppsScriptRemoteServiceError } from "./error";
import { formatGoogleHttpError } from "./google-error-response";
import { APPS_SCRIPT_PROJECTS_OAUTH_SCOPE } from "./google-oauth-authorization";
import type { GoogleOAuthDesktopClient } from "./google-oauth-client";
import {
  GOOGLE_OAUTH_TOKEN_URL,
  parseGoogleOAuthAccessToken,
  parseGoogleOAuthTokenResponse,
} from "./google-oauth-token-response";

export interface GoogleOAuthAuthorizationCodeTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiryDate: number;
  readonly scopes: readonly string[];
}

interface ExchangeGoogleOAuthAuthorizationCodeOptions {
  readonly client: GoogleOAuthDesktopClient;
  readonly code: string;
  readonly codeVerifier: string;
  readonly redirectUri: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly now?: () => number;
}

function requireValue(value: string, message: string): string {
  if (value.trim().length === 0) {
    throw new Error(message);
  }

  return value;
}

function parseAuthorizationCodeTokens(
  content: string,
  now: number,
): GoogleOAuthAuthorizationCodeTokens {
  const response = parseGoogleOAuthTokenResponse(content);
  const { accessToken, expiryDate } = parseGoogleOAuthAccessToken(response, now);
  const refreshToken = response.refresh_token;
  const scope = response.scope;

  if (
    typeof refreshToken !== "string" ||
    refreshToken.trim().length === 0 ||
    typeof scope !== "string" ||
    scope.trim().length === 0
  ) {
    throw new Error("Invalid Google OAuth token response.");
  }

  const scopes = scope.trim().split(/\s+/);

  if (!scopes.includes(APPS_SCRIPT_PROJECTS_OAUTH_SCOPE)) {
    throw new Error("Google OAuth response did not grant the required Apps Script scope.");
  }

  return {
    accessToken,
    refreshToken: refreshToken.trim(),
    expiryDate,
    scopes,
  };
}

export async function exchangeGoogleOAuthAuthorizationCode(
  options: ExchangeGoogleOAuthAuthorizationCodeOptions,
): Promise<GoogleOAuthAuthorizationCodeTokens> {
  const fetch = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;

  const body = new URLSearchParams({
    client_id: requireValue(options.client.clientId, "Google OAuth client ID is required."),
    client_secret: requireValue(
      options.client.clientSecret,
      "Google OAuth client secret is required.",
    ),
    code: requireValue(options.code, "Google OAuth authorization code is required."),
    code_verifier: requireValue(options.codeVerifier, "Google OAuth code verifier is required."),
    grant_type: "authorization_code",
    redirect_uri: requireValue(options.redirectUri, "Google OAuth redirect URI is required."),
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    throw new AppsScriptRemoteServiceError(
      `Google OAuth authorization code exchange failed: ${formatGoogleHttpError(
        response,
        responseBody,
      )}`,
    );
  }

  return parseAuthorizationCodeTokens(responseBody, now());
}
