import type { PluginOption } from "vite";

import type { ClientEntry, ProjectSnapshot, ResolvedProject } from "../project";

type BuildMode = "development" | "production";

export interface BuildPlan {
  readonly root: string;
  readonly outputDir: string;
  readonly clientDir: string;

  readonly appType: "spa" | "script";
  readonly mode: BuildMode;

  readonly plugins: readonly PluginOption[];

  readonly clientEntries: readonly ClientEntry[];
  readonly clientSources: readonly string[];
  readonly serverSources: readonly string[];
}

export function createBuildPlan(
  project: ResolvedProject,
  snapshot: ProjectSnapshot,
  mode: BuildMode,
): BuildPlan {
  return {
    root: project.root,
    outputDir: project.outputDir,
    clientDir: project.clientDir,

    appType: project.appType,
    mode,

    plugins: project.plugins,

    clientEntries: snapshot.clientEntries,
    clientSources: snapshot.clientSources,
    serverSources: snapshot.serverSources,
  };
}
