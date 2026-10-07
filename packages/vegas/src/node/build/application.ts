import { loadProject, scanProject, type ResolvedProject } from "../project";
import { type BuildArtifact, replaceOutputArtifacts } from "./artifact";
import { buildProjectArtifacts } from "./pipeline";

export interface BuildApplicationResult {
  readonly project: ResolvedProject;
  readonly artifacts: readonly BuildArtifact[];
  readonly durationMs: number;
}

interface BuildApplicationDependencies {
  readonly cwd: string;
  readonly now: () => number;
  readonly loadProject: typeof loadProject;
  readonly scanProject: typeof scanProject;
  readonly buildProjectArtifacts: typeof buildProjectArtifacts;
  readonly replaceOutputArtifacts: typeof replaceOutputArtifacts;
}

export async function runBuildApplicationWithDependencies(
  root: string | undefined,
  dependencies: BuildApplicationDependencies,
): Promise<BuildApplicationResult> {
  const project = await dependencies.loadProject({
    cwd: dependencies.cwd,
    root,
  });
  const snapshot = await dependencies.scanProject(project);
  const startTime = dependencies.now();
  const artifacts = await dependencies.buildProjectArtifacts(project, snapshot);

  await dependencies.replaceOutputArtifacts(project.outputDir, artifacts);

  return {
    project,
    artifacts,
    durationMs: dependencies.now() - startTime,
  };
}

export function runBuildApplication(root?: string): Promise<BuildApplicationResult> {
  return runBuildApplicationWithDependencies(root, {
    cwd: process.cwd(),
    now: () => performance.now(),
    loadProject,
    scanProject,
    buildProjectArtifacts,
    replaceOutputArtifacts,
  });
}
