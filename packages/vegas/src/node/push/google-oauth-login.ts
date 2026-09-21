import crypto from "node:crypto";
import fs from "node:fs";

import { DEFAULT_APPS_SCRIPT_AUTH_PROFILE, requireAppsScriptAuthProfile } from "./auth-profile";
import type { AppsScriptCredentialStore } from "./credential-store";
import { AppsScriptAuthPrerequisiteError } from "./error";
import type { GoogleHttpRequestLifetimeOptions } from "./google-http-request";
import {
  createGoogleOAuthAuthorizationUrl,
  createGoogleOAuthCodeChallenge,
} from "./google-oauth-authorization";
import { parseGoogleOAuthDesktopClient } from "./google-oauth-client";
import { startGoogleOAuthLoopbackListener } from "./google-oauth-loopback";
import { exchangeGoogleOAuthAuthorizationCode } from "./google-oauth-token-exchange";

export type GoogleOAuthAuthorizationUrlOpener = (url: string) => Promise<void>;

interface LoginGoogleAppsScriptOptions extends GoogleHttpRequestLifetimeOptions {
  readonly clientFilePath: string;
  readonly credentialStore: AppsScriptCredentialStore;
  readonly openAuthorizationUrl: GoogleOAuthAuthorizationUrlOpener;
  readonly profile?: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly now?: () => number;
}

interface LoginGoogleAppsScriptDependencies {
  readonly startLoopbackListener?: typeof startGoogleOAuthLoopbackListener;
}

async function readGoogleOAuthDesktopClientFile(filePath: string): Promise<string> {
  try {
    return await fs.promises.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new AppsScriptAuthPrerequisiteError(
        `Google OAuth desktop client file not found: ${filePath}`,
      );
    }

    throw error;
  }
}

function createGoogleOAuthState(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function createGoogleOAuthCodeVerifier(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export async function loginGoogleAppsScript(
  options: LoginGoogleAppsScriptOptions,
  dependencies: LoginGoogleAppsScriptDependencies = {},
): Promise<void> {
  const startLoopbackListener =
    dependencies.startLoopbackListener ?? startGoogleOAuthLoopbackListener;
  const profile = requireAppsScriptAuthProfile(options.profile ?? DEFAULT_APPS_SCRIPT_AUTH_PROFILE);

  const clientContent = await readGoogleOAuthDesktopClientFile(options.clientFilePath);

  const client = parseGoogleOAuthDesktopClient(clientContent);

  const state = createGoogleOAuthState();
  const codeVerifier = createGoogleOAuthCodeVerifier();
  const codeChallenge = createGoogleOAuthCodeChallenge(codeVerifier);

  const listener = await startLoopbackListener(state);

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
  } catch (error) {
    try {
      await listener.close();
    } catch {
      // Preserve the authorization error that triggered cleanup.
    }

    throw error;
  }

  await listener.close();

  const tokens = await exchangeGoogleOAuthAuthorizationCode({
    client,
    code,
    codeVerifier,
    redirectUri: listener.redirectUri,
    fetch: options.fetch,
    now: options.now,
    signal: options.signal,
    requestTimeoutMs: options.requestTimeoutMs,
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
