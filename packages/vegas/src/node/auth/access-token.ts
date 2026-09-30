import type { AppsScriptCredential } from "./credential";

export const APPS_SCRIPT_ACCESS_TOKEN_EXPIRY_SKEW_MS = 60_000;

export interface AppsScriptAccessTokenRequest {
  readonly minimumValidityMs?: number;
  readonly signal?: AbortSignal;
}

export interface AppsScriptAccessTokenProvider {
  getAccessToken(request?: AppsScriptAccessTokenRequest): Promise<string>;
}

export interface AppsScriptRefreshedAccessToken {
  readonly accessToken: string;
  readonly expiryDate: number;
}

export interface AppsScriptAccessTokenRefreshRequest {
  readonly signal?: AbortSignal;
}

export interface AppsScriptAccessTokenRefresher {
  refresh(
    credential: AppsScriptCredential,
    request?: AppsScriptAccessTokenRefreshRequest,
  ): Promise<AppsScriptRefreshedAccessToken>;
}

function requireMinimumValidityMs(minimumValidityMs: number): number {
  if (!Number.isInteger(minimumValidityMs) || minimumValidityMs < 0) {
    throw new RangeError(
      "Apps Script access token minimum validity must be a non-negative integer.",
    );
  }

  return minimumValidityMs;
}

export function getUsableAppsScriptAccessToken(
  credential: AppsScriptCredential,
  now: number,
  minimumValidityMs = APPS_SCRIPT_ACCESS_TOKEN_EXPIRY_SKEW_MS,
): string | undefined {
  const requiredValidityMs = Math.max(
    APPS_SCRIPT_ACCESS_TOKEN_EXPIRY_SKEW_MS,
    requireMinimumValidityMs(minimumValidityMs),
  );

  if (credential.accessToken === undefined || credential.expiryDate === undefined) {
    return undefined;
  }

  if (credential.expiryDate - now <= requiredValidityMs) {
    return undefined;
  }

  return credential.accessToken;
}
