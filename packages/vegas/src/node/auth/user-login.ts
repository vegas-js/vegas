import type { GoogleHttpRequestLifetimeOptions } from "../infrastructure/google/http-request";
import { createAppsScriptUserCredentialStore } from "./credential/user-store";
import { createGoogleOAuthAuthorizationUrlOpener } from "./google-oauth/browser";
import {
  loginGoogleAppsScript,
  type GoogleOAuthAuthorizationUrlOpener,
} from "./google-oauth/login";

interface LoginGoogleAppsScriptUserOptions extends GoogleHttpRequestLifetimeOptions {
  readonly clientFilePath: string;
  readonly profile?: string;
  readonly scopes?: readonly string[];
  readonly platform?: NodeJS.Platform;
  readonly homeDir?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly fetch?: typeof globalThis.fetch;
  readonly now?: () => number;
  readonly openAuthorizationUrl?: GoogleOAuthAuthorizationUrlOpener;
}

export async function loginGoogleAppsScriptUser(
  options: LoginGoogleAppsScriptUserOptions,
): Promise<void> {
  const credentialStore = createAppsScriptUserCredentialStore({
    platform: options.platform,
    homeDir: options.homeDir,
    env: options.env,
  });

  const openAuthorizationUrl =
    options.openAuthorizationUrl ??
    createGoogleOAuthAuthorizationUrlOpener({
      platform: options.platform,
    });

  await loginGoogleAppsScript({
    clientFilePath: options.clientFilePath,
    credentialStore,
    openAuthorizationUrl,
    profile: options.profile,
    scopes: options.scopes,
    fetch: options.fetch,
    now: options.now,
    signal: options.signal,
    requestTimeoutMs: options.requestTimeoutMs,
  });
}
