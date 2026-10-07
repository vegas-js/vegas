import path from "node:path";

import { loadUserConfig, type LoadedUserConfig } from "./load-config";
import { resolveProject } from "./resolve";
import { validateUserConfig } from "./validate-config";

interface ProjectLoaderOptions {
  cwd: string;
  root?: string;
}

type ProjectConfigLoader = (directory: string) => Promise<LoadedUserConfig>;

export async function loadProject(
  options: ProjectLoaderOptions,
  loadConfig: ProjectConfigLoader = loadUserConfig,
) {
  const configDir = path.resolve(options.cwd, options.root ?? ".");

  const loaded = await loadConfig(configDir);
  const config = validateUserConfig(loaded.config);

  return resolveProject(config, {
    cwd: options.cwd,
    root: options.root,
    configFile: loaded.configFile,
  });
}
