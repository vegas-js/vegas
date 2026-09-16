import { createAppsScriptApiPushTransport } from "./api-transport";
import { loadAppsScriptPushRequest } from "./load-request";
import { createAppsScriptUserAccessTokenProvider } from "./user-access-token-provider";

interface PushAppsScriptProjectOptions {
  readonly projectRoot: string;
  readonly outputDir: string;
  readonly profile?: string;
  readonly platform?: NodeJS.Platform;
  readonly homeDir?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly fetch?: typeof globalThis.fetch;
  readonly now?: () => number;
}

export async function pushAppsScriptProject(options: PushAppsScriptProjectOptions): Promise<void> {
  const request = await loadAppsScriptPushRequest({
    projectRoot: options.projectRoot,
    outputDir: options.outputDir,
  });

  const accessTokenProvider = createAppsScriptUserAccessTokenProvider({
    profile: options.profile,
    platform: options.platform,
    homeDir: options.homeDir,
    env: options.env,
    fetch: options.fetch,
    now: options.now,
  });

  const transport = createAppsScriptApiPushTransport({
    accessTokenProvider,
    fetch: options.fetch,
  });

  await transport.push(request);
}
