import { UserConfig } from "../shared/config";

export type { AppsScriptConfig, AppsScriptManifest, UserConfig } from "../shared/config";

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}
