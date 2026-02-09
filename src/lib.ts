import { PluginOption } from "vite";

export type UserConfig = {
  root?: string;
  webDir?: string;
  serverDir?: string;
  // gasMockDir?: string;
  plugins?: PluginOption[];
};

export type ResolvedUserConfig = Required<UserConfig>;

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}
