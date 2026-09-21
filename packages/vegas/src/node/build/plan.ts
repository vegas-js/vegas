import type { PluginOption } from "vite";

import type { ProjectSnapshot, ResolvedProject } from "../project";

type BuildMode = "development" | "production";

export interface ClientModuleBuildTarget {
  readonly sourcePath: string;
  readonly htmlPath: string;
}

export interface BuildPlan {
  readonly root: string;
  readonly outputDir: string;

  readonly appType: "spa" | "script";
  readonly mode: BuildMode;

  readonly plugins: readonly PluginOption[];

  readonly clientModuleTargets: readonly ClientModuleBuildTarget[];
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

    appType: project.appType,
    mode,

    plugins: project.plugins,

    clientModuleTargets: snapshot.clientEntries.map((entry) => ({
      sourcePath: entry.sourcePath,
      htmlPath: entry.htmlPath,
    })),
    clientSources: snapshot.clientSources,
    serverSources: snapshot.serverSources,
  };
}
