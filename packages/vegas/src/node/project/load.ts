import fs from "node:fs";
import path from "node:path";

import { loadModule } from "../module";
import { resolveProject } from "./resolve";
import { validateUserConfig } from "./validate-config";

interface LoadedConfig {
  readonly config: unknown;
  readonly configFile: string | null;
}

interface ProjectLoaderOptions {
  cwd: string;
  root?: string;
}

async function loadConfigFromDirectory(directory: string): Promise<LoadedConfig> {
  const filePath = path.join(directory, "vegas.config.ts");

  if (!fs.existsSync(filePath)) {
    return {
      config: {},
      configFile: null,
    };
  }

  const config: unknown = await loadModule({
    root: directory,
    filePath,
  });

  return {
    config,
    configFile: filePath,
  };
}

export async function loadProject(
  options: ProjectLoaderOptions,
  loadConfig: typeof loadConfigFromDirectory = loadConfigFromDirectory,
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
