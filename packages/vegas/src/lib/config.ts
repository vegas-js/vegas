import type { UserConfig } from "../shared/config";

export type {
  AppsScriptConfig,
  AppsScriptManifest,
  DevServerConfig,
  UserConfig,
} from "../shared/config";

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}
