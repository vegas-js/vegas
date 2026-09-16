import { loadProject } from "../project";
import { pushAppsScriptProject } from "../push";

interface PushOptions {
  readonly profile?: string;
}

export async function runPush(root?: string, options: PushOptions = {}): Promise<void> {
  const project = await loadProject({
    cwd: process.cwd(),
    root,
  });

  await pushAppsScriptProject({
    projectRoot: project.root,
    outputDir: project.outputDir,
    profile: options.profile,
  });
}
