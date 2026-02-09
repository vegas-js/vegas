import { PluginOption } from "vite";

type BaseConfig = {
  root?: string;
  webDir?: string;
  serverDir?: string;
  // gasMockDir?: string;
  plugins?: PluginOption[];
};
type OutputConfig = {
  dir?: string;
};

export type UserConfig = BaseConfig & { output?: OutputConfig };

export type ResolvedUserConfig = Required<BaseConfig> & { output: Required<OutputConfig> };

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}
