import path from "node:path";

import { BaseConfig, GASManifest, OutputConfig, UserConfig } from "../../../shared/config";
import { loadModule } from "./module";

export type ResolvedUserConfig = Required<BaseConfig> & {
  output: Required<OutputConfig>;
  gas: GASManifest;
};

export async function loadConfig(root: string) {
  const mod = loadModule({ root, filePath: path.join(root, "vegas.config.ts") });

  return mod as UserConfig;
}

export function resolveConfig(userConfig: UserConfig): ResolvedUserConfig {
  const root = path.resolve(userConfig.root ?? ".");
  const webDir = path.resolve(path.join(root, userConfig.webDir ?? path.join("src", "web")));
  const serverDir = path.resolve(
    path.join(root, userConfig.serverDir ?? path.join("src", "server")),
  );
  const gasMockDir = path.resolve(path.join(root, userConfig.gasMockDir ?? "mock"));
  const plugins = userConfig.plugins ?? [];
  const output = {
    dir: path.resolve(path.join(root, userConfig.output?.dir ?? "dist")),
  };
  const gas: GASManifest = {
    dependencies: userConfig.gas?.dependencies,
    exceptionLogging: userConfig.gas?.exceptionLogging ?? "STACKDRIVER",
    oauthScopes: userConfig.gas?.oauthScopes,
    runtimeVersion: userConfig.gas?.runtimeVersion ?? "V8",
    timeZone: userConfig.gas?.timeZone ?? "UTC",
    webapp: {
      access: userConfig.gas?.webapp?.access ?? "MYSELF",
      executeAs: userConfig.gas?.webapp?.executeAs ?? "USER_ACCESSING",
    },
  };

  return { root, webDir, serverDir, gasMockDir, plugins, output, gas };
}
