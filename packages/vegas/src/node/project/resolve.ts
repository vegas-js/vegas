import path from "node:path";

import type { UserConfig } from "../../shared/config";
import type { ResolvedProject } from "./type";

export function resolveProject(
  config: UserConfig,
  options: { cwd: string; root?: string; configFile: string | null },
): ResolvedProject {
  const root = path.resolve(options.cwd, options.root ?? config.root ?? ".");

  return {
    root,
    appType: config.appType ?? "spa",
    clientDir:
      config.clientDir === undefined
        ? path.resolve(root, "src", "client")
        : path.resolve(root, config.clientDir),
    serverDir:
      config.serverDir === undefined
        ? path.resolve(root, "src", "server")
        : path.resolve(root, config.serverDir),
    gasMockDir:
      config.gasMockDir === undefined
        ? path.resolve(root, "mock")
        : path.resolve(root, config.gasMockDir),
    outputDir:
      config.output?.dir === undefined
        ? path.resolve(root, "dist")
        : path.resolve(root, config.output.dir),
    configFile: options.configFile,
    plugins: config.plugins ?? [],
    gas: {
      dependencies: config.gas?.dependencies,
      exceptionLogging: config.gas?.exceptionLogging ?? "STACKDRIVER",
      oauthScopes: config.gas?.oauthScopes,
      runtimeVersion: config.gas?.runtimeVersion ?? "V8",
      timeZone: config.gas?.timeZone ?? "UTC",
      webapp: {
        access: config.gas?.webapp?.access ?? "MYSELF",
        executeAs: config.gas?.webapp?.executeAs ?? "USER_ACCESSING",
      },
    },
  };
}
