import fs from "node:fs";
import path from "node:path";

import type { UserConfig } from "../../shared/config";
import { loadModule } from "../module";
import { resolveProject } from "./resolve";

interface LoadedConfig {
  readonly config: UserConfig;
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

  const config = (await loadModule({
    root: directory,
    filePath,
  })) as UserConfig;

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

  return resolveProject(loaded.config, {
    cwd: options.cwd,
    root: options.root,
    configFile: loaded.configFile,
  });
}
