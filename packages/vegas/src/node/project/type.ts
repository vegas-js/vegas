import type { PluginOption } from "vite";

import type { AppsScriptManifest } from "../../shared/config";

export interface ResolvedProject {
  readonly root: string;
  readonly configFile: string | null;
  readonly clientDir: string;
  readonly serverDir: string;
  readonly runtimeDataDir: string;
  readonly outputDir: string;
  readonly appType: "spa" | "script";
  readonly plugins: readonly PluginOption[];

  readonly appsScript: {
    readonly scriptId?: string;
    readonly manifest: AppsScriptManifest;
  };
}

export interface ClientModuleEntry {
  readonly id: string;
  readonly sourcePath: string;
  readonly htmlPath: string;
}

export interface ClientHtmlEntry {
  readonly sourcePath: string;
  readonly htmlPath: string;
}

export interface ProjectSnapshot {
  readonly clientSources: readonly string[];
  readonly serverSources: readonly string[];
  readonly runtimeDataSources: readonly string[];
  readonly clientModuleEntries: readonly ClientModuleEntry[];
  readonly clientHtmlEntries: readonly ClientHtmlEntry[];
}
