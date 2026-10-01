import type { UserConfig, UserConfigExport, UserConfigFactory } from "../shared/config";

export type {
  AppsScriptConfig,
  AppsScriptManifest,
  DevServerConfig,
  UserConfig,
  UserConfigExport,
  UserConfigFactory,
} from "../shared/config";

export function defineConfig(config: UserConfig): UserConfig;
export function defineConfig(config: Promise<UserConfig>): Promise<UserConfig>;
export function defineConfig(config: UserConfigFactory): UserConfigFactory;
export function defineConfig(config: UserConfigExport): UserConfigExport {
  return config;
}
