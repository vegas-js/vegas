import { createAppsScriptUserAccessTokenProvider } from "./push";
import type { RuntimeBackend } from "./runtime";
import { createGoogleAppsScriptRuntime } from "./runtime/node";

interface GoogleAppsScriptUserRuntimeOptions {
  readonly scriptId: string;
  readonly profile?: string;
  readonly requiredScopes?: readonly string[];
  readonly devMode?: boolean;
  readonly requestTimeoutMs?: number;
  readonly accessTokenRequestTimeoutMs?: number;
  readonly platform?: NodeJS.Platform;
  readonly homeDir?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly fetch?: typeof globalThis.fetch;
  readonly now?: () => number;
}

type AppsScriptUserAccessTokenProviderFactory = (
  options: NonNullable<Parameters<typeof createAppsScriptUserAccessTokenProvider>[0]>,
) => ReturnType<typeof createAppsScriptUserAccessTokenProvider>;

interface GoogleAppsScriptUserRuntimeDependencies {
  readonly createAccessTokenProvider?: AppsScriptUserAccessTokenProviderFactory;
  readonly createRuntime?: typeof createGoogleAppsScriptRuntime;
}

export function createGoogleAppsScriptUserRuntime(
  options: GoogleAppsScriptUserRuntimeOptions,
  dependencies: GoogleAppsScriptUserRuntimeDependencies = {},
): RuntimeBackend {
  const createAccessTokenProvider =
    dependencies.createAccessTokenProvider ?? createAppsScriptUserAccessTokenProvider;
  const accessTokenProvider = createAccessTokenProvider({
    profile: options.profile,
    requiredScopes: options.requiredScopes,
    platform: options.platform,
    homeDir: options.homeDir,
    env: options.env,
    fetch: options.fetch,
    now: options.now,
    requestTimeoutMs: options.accessTokenRequestTimeoutMs,
  });
  const createRuntime = dependencies.createRuntime ?? createGoogleAppsScriptRuntime;

  return createRuntime({
    scriptId: options.scriptId,
    devMode: options.devMode,
    requestTimeoutMs: options.requestTimeoutMs,
    fetch: options.fetch,
    acquireAccessToken(minimumValidityMs, signal) {
      return accessTokenProvider.getAccessToken({
        minimumValidityMs,
        signal,
      });
    },
  });
}
