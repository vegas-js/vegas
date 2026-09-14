import type { PluginOption } from "vite";

import type { GASManifest } from "../../shared/config";

export interface ResolvedProject {
  readonly root: string;
  readonly configFile: string | null;
  readonly clientDir: string;
  readonly serverDir: string;
  readonly gasMockDir: string;
  readonly outputDir: string;
  readonly appType: "spa" | "script";
  readonly plugins: readonly PluginOption[];
  readonly gas: GASManifest;
}
