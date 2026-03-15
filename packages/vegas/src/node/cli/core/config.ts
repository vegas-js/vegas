import fs from "node:fs";
import path from "node:path";

import { BaseConfig, GASManifest, OutputConfig, UserConfig } from "../../../shared/config";
import { loadModule } from "./module";

export type ResolvedUserConfig = Required<BaseConfig> & {
  output: Required<OutputConfig>;
  gas: GASManifest;
};

export async function loadConfig(root: string) {
  const globPattern = path.join(root, "vegas.config.[jt]s");
  const globs = fs.promises.glob(globPattern);
  const configPaths: string[] = [];
  for await (const configPath of globs) {
    configPaths.push(configPath);
  }
  if (configPaths.length === 0) {
    throw new Error("Could not found config file");
  }
  configPaths.sort();
  const mod = loadModule({ root, filePath: configPaths[0] });

  return mod as UserConfig;
}

export function resolveConfig(userConfig: UserConfig): ResolvedUserConfig {
  const root = userConfig.root ?? ".";
  const webDir = path.resolve(root, userConfig.webDir ?? path.join("src", "web"));
  const serverDir = path.resolve(root, userConfig.serverDir ?? path.join("src", "server"));
  const gasMockDir = path.resolve(root, userConfig.gasMockDir ?? "mock");
  const plugins = userConfig.plugins ?? [];
  const output = {
    dir: path.resolve(root, userConfig.output?.dir ?? "dist"),
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
