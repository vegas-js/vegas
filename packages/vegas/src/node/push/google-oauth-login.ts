import crypto from "node:crypto";
import fs from "node:fs";

import { DEFAULT_APPS_SCRIPT_AUTH_PROFILE, requireAppsScriptAuthProfile } from "./auth-profile";
import type { AppsScriptCredentialStore } from "./credential-store";
import {
  createGoogleOAuthAuthorizationUrl,
  createGoogleOAuthCodeChallenge,
} from "./google-oauth-authorization";
import { parseGoogleOAuthDesktopClient } from "./google-oauth-client";
import { startGoogleOAuthLoopbackListener } from "./google-oauth-loopback";
import { exchangeGoogleOAuthAuthorizationCode } from "./google-oauth-token-exchange";

export type GoogleOAuthAuthorizationUrlOpener = (url: string) => Promise<void>;

interface LoginGoogleAppsScriptOptions {
  readonly clientFilePath: string;
  readonly credentialStore: AppsScriptCredentialStore;
  readonly openAuthorizationUrl: GoogleOAuthAuthorizationUrlOpener;
  readonly profile?: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly now?: () => number;
}

function createGoogleOAuthState(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function createGoogleOAuthCodeVerifier(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export async function loginGoogleAppsScript(options: LoginGoogleAppsScriptOptions): Promise<void> {
  const profile = requireAppsScriptAuthProfile(options.profile ?? DEFAULT_APPS_SCRIPT_AUTH_PROFILE);

  const clientContent = await fs.promises.readFile(options.clientFilePath, "utf8");

  const client = parseGoogleOAuthDesktopClient(clientContent);

  const state = createGoogleOAuthState();
  const codeVerifier = createGoogleOAuthCodeVerifier();
  const codeChallenge = createGoogleOAuthCodeChallenge(codeVerifier);

  const listener = await startGoogleOAuthLoopbackListener(state);

  let code: string;

  try {
    const authorizationUrl = createGoogleOAuthAuthorizationUrl({
      clientId: client.clientId,
      redirectUri: listener.redirectUri,
      state,
      codeChallenge,
    });

    await options.openAuthorizationUrl(authorizationUrl);

    const callback = await listener.waitForCallback();
    code = callback.code;
  } finally {
    await listener.close();
  }

  const tokens = await exchangeGoogleOAuthAuthorizationCode({
    client,
    code,
    codeVerifier,
    redirectUri: listener.redirectUri,
    fetch: options.fetch,
    now: options.now,
  });

  await options.credentialStore.save(profile, {
    clientId: client.clientId,
    clientSecret: client.clientSecret,
    refreshToken: tokens.refreshToken,
    accessToken: tokens.accessToken,
    expiryDate: tokens.expiryDate,
    scopes: tokens.scopes,
  });
}
