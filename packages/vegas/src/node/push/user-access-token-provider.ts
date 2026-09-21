import type { AppsScriptAccessTokenProvider } from "./access-token";
import { createAppsScriptCredentialAccessTokenProvider } from "./credential-access-token-provider";
import { createGoogleAppsScriptAccessTokenRefresher } from "./google-access-token-refresher";
import type { GoogleHttpRequestLifetimeOptions } from "./google-http-request";
import { createAppsScriptUserCredentialStore } from "./user-credential-store";

interface CreateAppsScriptUserAccessTokenProviderOptions extends GoogleHttpRequestLifetimeOptions {
  readonly profile?: string;
  readonly platform?: NodeJS.Platform;
  readonly homeDir?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly fetch?: typeof globalThis.fetch;
  readonly now?: () => number;
}

export function createAppsScriptUserAccessTokenProvider(
  options: CreateAppsScriptUserAccessTokenProviderOptions = {},
): AppsScriptAccessTokenProvider {
  const now = options.now ?? Date.now;

  const credentialStore = createAppsScriptUserCredentialStore({
    platform: options.platform,
    homeDir: options.homeDir,
    env: options.env,
  });

  const refresher = createGoogleAppsScriptAccessTokenRefresher({
    fetch: options.fetch,
    now,
    signal: options.signal,
    requestTimeoutMs: options.requestTimeoutMs,
  });

  return createAppsScriptCredentialAccessTokenProvider({
    credentialStore,
    refresher,
    profile: options.profile,
    now,
  });
}
