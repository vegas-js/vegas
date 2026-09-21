import fs from "node:fs";
import path from "node:path";

import { loadModule } from "../module";

export interface LoadedUserConfig {
  readonly config: unknown;
  readonly configFile: string | null;
}

export async function loadUserConfig(directory: string): Promise<LoadedUserConfig> {
  const filePath = path.join(directory, "vegas.config.ts");

  if (!fs.existsSync(filePath)) {
    return {
      config: {},
      configFile: null,
    };
  }

  return {
    config: await loadModule({
      root: directory,
      filePath,
    }),
    configFile: filePath,
  };
}
