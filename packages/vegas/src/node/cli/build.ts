import { buildProjectArtifacts, replaceOutputArtifacts } from "../build";
import { loadProject, scanProject } from "../project";
import { printBanner } from "./presentation/banner";
import { printReport } from "./presentation/print-report";

export async function runBuild(root?: string) {
  printBanner();

  const project = await loadProject({
    cwd: process.cwd(),
    root,
  });

  const snapshot = await scanProject(project);

  const startTime = performance.now();

  const artifacts = await buildProjectArtifacts(project, snapshot);

  await replaceOutputArtifacts(project.outputDir, artifacts);

  const endTime = performance.now();

  printReport(project, artifacts, endTime - startTime);
}
