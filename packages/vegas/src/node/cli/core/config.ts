import fs from "node:fs";
import path from "node:path";

import { BaseConfig, GASManifest, OutputConfig, UserConfig } from "../../../shared/config";
import { loadModule } from "./module";

export type ResolvedUserConfig = Required<BaseConfig> & {
  output: Required<OutputConfig>;
  gas: GASManifest;
};

export async function loadConfig(root: string) {
  const filePath = path.join(root, "vegas.config.ts");
  const mod = fs.existsSync(filePath) ? loadModule({ root, filePath }) : {};

  return mod as UserConfig;
}

export function resolveConfig(userConfig: UserConfig): ResolvedUserConfig {
  const root = userConfig.root ?? ".";
  const clientDir = path.resolve(root, userConfig.clientDir ?? path.join("src", "client"));
  const serverDir = path.resolve(root, userConfig.serverDir ?? path.join("src", "server"));
  const gasMockDir = path.resolve(root, userConfig.gasMockDir ?? "mock");
  const plugins = userConfig.plugins ?? [];
  // const appType = userConfig.appType ?? "spa";
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

  return { root, clientDir, serverDir, gasMockDir, plugins, /* appType, */ output, gas };
}
