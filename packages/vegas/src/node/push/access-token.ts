import type { AppsScriptCredential } from "./credential";

export const APPS_SCRIPT_ACCESS_TOKEN_EXPIRY_SKEW_MS = 60_000;

export interface AppsScriptAccessTokenProvider {
  getAccessToken(): Promise<string>;
}

export interface AppsScriptRefreshedAccessToken {
  readonly accessToken: string;
  readonly expiryDate: number;
}

export interface AppsScriptAccessTokenRefresher {
  refresh(credential: AppsScriptCredential): Promise<AppsScriptRefreshedAccessToken>;
}

export function getUsableAppsScriptAccessToken(
  credential: AppsScriptCredential,
  now: number,
): string | undefined {
  if (credential.accessToken === undefined || credential.expiryDate === undefined) {
    return undefined;
  }

  if (credential.expiryDate - now <= APPS_SCRIPT_ACCESS_TOKEN_EXPIRY_SKEW_MS) {
    return undefined;
  }

  return credential.accessToken;
}
