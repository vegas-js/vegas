import type { PluginOption } from "vite";

import type { ProjectSnapshot, ResolvedProject } from "../project";

type BuildMode = "development" | "production";

export interface ClientModuleBuildTarget {
  readonly sourcePath: string;
  readonly htmlPath: string;
}

export interface ClientHtmlBuildTarget {
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
  readonly clientHtmlTargets: readonly ClientHtmlBuildTarget[];
  readonly clientSources: readonly string[];
  readonly serverSources: readonly string[];
}

function assertUniqueClientHtmlPaths(
  targets: readonly (ClientModuleBuildTarget | ClientHtmlBuildTarget)[],
): void {
  const htmlPaths = new Set<string>();

  for (const target of targets) {
    if (htmlPaths.has(target.htmlPath)) {
      throw new Error(`Duplicate client HTML output: ${target.htmlPath}`);
    }

    htmlPaths.add(target.htmlPath);
  }
}

export function createBuildPlan(
  project: ResolvedProject,
  snapshot: ProjectSnapshot,
  mode: BuildMode,
): BuildPlan {
  const clientModuleTargets = snapshot.clientModuleEntries.map((entry) => ({
    sourcePath: entry.sourcePath,
    htmlPath: entry.htmlPath,
  }));
  const clientHtmlTargets = snapshot.clientHtmlEntries.map((entry) => ({
    sourcePath: entry.sourcePath,
    htmlPath: entry.htmlPath,
  }));

  assertUniqueClientHtmlPaths([...clientModuleTargets, ...clientHtmlTargets]);

  return {
    root: project.root,
    outputDir: project.outputDir,

    appType: project.appType,
    mode,

    plugins: project.plugins,

    clientModuleTargets,
    clientHtmlTargets,
    clientSources: snapshot.clientSources,
    serverSources: snapshot.serverSources,
  };
}
