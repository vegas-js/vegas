import fs from "node:fs";
import path from "node:path";

import { loadModule } from "../module";

const CONFIG_FILE_NAMES = ["vegas.config.ts", "vegas.config.js", "vegas.config.json"] as const;

export interface LoadedUserConfig {
  readonly config: unknown;
  readonly configFile: string | null;
}

function findConfigFile(directory: string): string | null {
  const configFiles = CONFIG_FILE_NAMES.map((fileName) => path.join(directory, fileName)).filter(
    (filePath) => fs.existsSync(filePath),
  );

  if (configFiles.length > 1) {
    throw new Error(
      `Multiple Vegas config files found: ${configFiles
        .map((filePath) => path.basename(filePath))
        .join(", ")}.`,
    );
  }

  return configFiles[0] ?? null;
}

async function resolveConfigExport(config: unknown): Promise<unknown> {
  if (typeof config === "function") {
    return Promise.resolve(config());
  }

  return config;
}

async function loadConfigFile(directory: string, filePath: string): Promise<unknown> {
  if (path.extname(filePath) === ".json") {
    const content = await fs.promises.readFile(filePath, "utf8");
    const config: unknown = JSON.parse(content);

    return config;
  }

  const config = await loadModule({
    root: directory,
    filePath,
  });

  return resolveConfigExport(config);
}

export async function loadUserConfig(directory: string): Promise<LoadedUserConfig> {
  const configFile = findConfigFile(directory);

  if (configFile === null) {
    return {
      config: {},
      configFile: null,
    };
  }

  return {
    config: await loadConfigFile(directory, configFile),
    configFile,
  };
}
