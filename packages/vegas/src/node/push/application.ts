import { loadProject } from "../project";
import { pushAppsScriptProject } from "./direct-push";

interface PushApplicationOptions {
  readonly profile?: string;
}

interface PushApplicationDependencies {
  readonly cwd: string;
  readonly loadProject: typeof loadProject;
  readonly pushAppsScriptProject: typeof pushAppsScriptProject;
}

export async function runPushApplicationWithDependencies(
  root: string | undefined,
  options: PushApplicationOptions,
  dependencies: PushApplicationDependencies,
): Promise<void> {
  const project = await dependencies.loadProject({
    cwd: dependencies.cwd,
    root,
  });

  await dependencies.pushAppsScriptProject({
    projectRoot: project.root,
    outputDir: project.outputDir,
    projectScriptId: project.appsScript.scriptId,
    profile: options.profile,
  });
}

export function runPushApplication(
  root?: string,
  options: PushApplicationOptions = {},
): Promise<void> {
  return runPushApplicationWithDependencies(root, options, {
    cwd: process.cwd(),
    loadProject,
    pushAppsScriptProject,
  });
}
