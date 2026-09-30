import os from "node:os";

import { resolveAppsScriptCredentialPath } from "./credential-path";
import type { AppsScriptCredentialStore } from "./credential-store";
import { createAppsScriptFileCredentialStore } from "./file-credential-store";

interface CreateAppsScriptUserCredentialStoreOptions {
  readonly platform?: NodeJS.Platform;
  readonly homeDir?: string;
  readonly env?: NodeJS.ProcessEnv;
}

export function createAppsScriptUserCredentialStore(
  options: CreateAppsScriptUserCredentialStoreOptions = {},
): AppsScriptCredentialStore {
  const platform = options.platform ?? process.platform;
  const homeDir = options.homeDir ?? os.homedir();
  const env = options.env ?? process.env;

  const filePath = resolveAppsScriptCredentialPath({
    platform,
    homeDir,
    xdgConfigHome: env.XDG_CONFIG_HOME,
    appData: env.APPDATA,
  });

  return createAppsScriptFileCredentialStore(filePath);
}
