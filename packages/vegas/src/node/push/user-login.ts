import { createGoogleOAuthAuthorizationUrlOpener } from "./google-oauth-browser";
import {
  loginGoogleAppsScript,
  type GoogleOAuthAuthorizationUrlOpener,
} from "./google-oauth-login";
import { createAppsScriptUserCredentialStore } from "./user-credential-store";

interface LoginGoogleAppsScriptUserOptions {
  readonly clientFilePath: string;
  readonly profile?: string;
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
    fetch: options.fetch,
    now: options.now,
  });
}
