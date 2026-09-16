import path from "node:path";

import type { UserConfig } from "../../shared/config";
import type { ResolvedProject } from "./type";

export function resolveProject(
  config: UserConfig,
  options: { cwd: string; root?: string; configFile: string | null },
): ResolvedProject {
  const root = path.resolve(options.cwd, options.root ?? config.root ?? ".");
  const appsScriptManifest = config.appsScript?.manifest;

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

    appsScript: {
      scriptId: config.appsScript?.scriptId,
      manifest: {
        dependencies: appsScriptManifest?.dependencies,
        exceptionLogging: appsScriptManifest?.exceptionLogging ?? "STACKDRIVER",
        oauthScopes: appsScriptManifest?.oauthScopes,
        runtimeVersion: appsScriptManifest?.runtimeVersion ?? "V8",
        timeZone: appsScriptManifest?.timeZone ?? "UTC",
        webapp: {
          access: appsScriptManifest?.webapp?.access ?? "MYSELF",
          executeAs: appsScriptManifest?.webapp?.executeAs ?? "USER_ACCESSING",
        },
      },
    },
  };
}
