import crypto from "node:crypto";

export const APPS_SCRIPT_PROJECTS_OAUTH_SCOPE = "https://www.googleapis.com/auth/script.projects";

const GOOGLE_OAUTH_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_OAUTH_CODE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;

interface CreateGoogleOAuthAuthorizationUrlOptions {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly state: string;
  readonly codeChallenge: string;
}

function requireValue(value: string, message: string): string {
  if (value.trim().length === 0) {
    throw new Error(message);
  }

  return value;
}

export function createGoogleOAuthCodeChallenge(codeVerifier: string): string {
  if (!GOOGLE_OAUTH_CODE_VERIFIER_PATTERN.test(codeVerifier)) {
    throw new Error("Invalid Google OAuth code verifier.");
  }

  return crypto.createHash("sha256").update(codeVerifier, "ascii").digest("base64url");
}

export function createGoogleOAuthAuthorizationUrl(
  options: CreateGoogleOAuthAuthorizationUrlOptions,
): string {
  const url = new URL(GOOGLE_OAUTH_AUTHORIZATION_URL);

  url.search = new URLSearchParams({
    client_id: requireValue(options.clientId, "Google OAuth client ID is required."),
    redirect_uri: requireValue(options.redirectUri, "Google OAuth redirect URI is required."),
    response_type: "code",
    scope: APPS_SCRIPT_PROJECTS_OAUTH_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: requireValue(options.state, "Google OAuth state is required."),
    code_challenge: requireValue(options.codeChallenge, "Google OAuth code challenge is required."),
    code_challenge_method: "S256",
  }).toString();

  return url.href;
}
