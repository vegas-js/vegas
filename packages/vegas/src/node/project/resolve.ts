import path from "node:path";

import type { UserConfig } from "../../shared/config";
import type { ResolvedProject } from "./type";
import { ConfigValidationError } from "./validate-config";

function isStrictDescendant(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);

  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function assertOutputDirDoesNotContain(
  outputDir: string,
  sourceDir: string,
  sourceOption: string,
): void {
  if (outputDir === sourceDir || isStrictDescendant(outputDir, sourceDir)) {
    throw new ConfigValidationError(`"output.dir" must not contain "${sourceOption}".`);
  }
}

function resolveOutputDir(root: string, output: UserConfig["output"]): string {
  const outputDir =
    output?.dir === undefined ? path.resolve(root, "dist") : path.resolve(root, output.dir);

  if (outputDir === root) {
    throw new ConfigValidationError('"output.dir" must not resolve to the project root.');
  }

  if (isStrictDescendant(outputDir, root)) {
    throw new ConfigValidationError('"output.dir" must not contain the project root.');
  }

  if (!isStrictDescendant(root, outputDir) && output?.allowOutsideRoot !== true) {
    throw new ConfigValidationError(
      '"output.dir" resolves outside the project root. Set "output.allowOutsideRoot" to true to allow it.',
    );
  }

  return outputDir;
}

export function resolveProject(
  config: UserConfig,
  options: { cwd: string; root?: string; configFile: string | null },
): ResolvedProject {
  const root = path.resolve(options.cwd, options.root ?? config.root ?? ".");
  const appType = config.appType ?? "spa";
  const appsScriptManifest = config.appsScript?.manifest;
  const clientDir =
    config.clientDir === undefined
      ? path.resolve(root, "src", "client")
      : path.resolve(root, config.clientDir);
  const serverDir =
    config.serverDir === undefined
      ? appType === "script"
        ? path.resolve(root, "src")
        : path.resolve(root, "src", "server")
      : path.resolve(root, config.serverDir);
  const runtimeDataDir =
    config.runtimeDataDir === undefined
      ? path.resolve(root, "runtime")
      : path.resolve(root, config.runtimeDataDir);
  const outputDir = resolveOutputDir(root, config.output);

  assertOutputDirDoesNotContain(outputDir, clientDir, "clientDir");
  assertOutputDirDoesNotContain(outputDir, serverDir, "serverDir");
  assertOutputDirDoesNotContain(outputDir, runtimeDataDir, "runtimeDataDir");

  return {
    root,
    appType,
    clientDir,
    serverDir,
    runtimeDataDir,
    outputDir,
    configFile: options.configFile,
    plugins: config.plugins ?? [],
    devServer: {
      host: config.devServer?.host,
      port: config.devServer?.port,
      open: config.devServer?.open ?? false,
    },

    appsScript: {
      scriptId: config.appsScript?.scriptId,
      manifest: {
        dependencies: appsScriptManifest?.dependencies,
        exceptionLogging: appsScriptManifest?.exceptionLogging ?? "STACKDRIVER",
        executionApi: appsScriptManifest?.executionApi,
        oauthScopes: appsScriptManifest?.oauthScopes,
        runtimeVersion: appsScriptManifest?.runtimeVersion ?? "V8",
        sheets: appsScriptManifest?.sheets,
        timeZone: appsScriptManifest?.timeZone ?? "UTC",
        urlFetchWhitelist: appsScriptManifest?.urlFetchWhitelist,
        webapp: {
          access: appsScriptManifest?.webapp?.access ?? "MYSELF",
          executeAs: appsScriptManifest?.webapp?.executeAs ?? "USER_ACCESSING",
        },
      },
    },
  };
}
