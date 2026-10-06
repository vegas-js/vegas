import { buildRuntimeProgram } from "../build";
import { loadProject, type ResolvedProject } from "../project";
import type { Program } from "../runtime";

export interface HarnessProject {
  readonly project: ResolvedProject;
  readonly program: Program;
}

export interface HarnessProjectOptions {
  readonly root?: string;
}

export type HarnessProjectLoader = (options: HarnessProjectOptions) => Promise<HarnessProject>;

export interface HarnessProjectDependencies {
  readonly cwd: string;
  readonly loadProject: typeof loadProject;
  readonly buildRuntimeProgram: typeof buildRuntimeProgram;
}

export async function loadHarnessProjectWithDependencies(
  options: HarnessProjectOptions,
  dependencies: HarnessProjectDependencies,
): Promise<HarnessProject> {
  const project = await dependencies.loadProject({
    cwd: dependencies.cwd,
    root: options.root,
  });
  const program = await dependencies.buildRuntimeProgram(project, "development");

  return {
    project,
    program,
  };
}

export function loadHarnessProject(options: HarnessProjectOptions = {}): Promise<HarnessProject> {
  return loadHarnessProjectWithDependencies(options, {
    cwd: process.cwd(),
    loadProject,
    buildRuntimeProgram,
  });
}
