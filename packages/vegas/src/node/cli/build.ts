import fs from "node:fs";

import { createBuilder } from "vite";

import { loadProject, scanProject } from "../project";
import { isWebApp } from "./core/analyze";
import { buildApp, createBuilderConfig, printBanner } from "./core/build";
import { generateGASManifest } from "./core/manifest";
import { collectArtifacts, printReport } from "./core/printReport";

export async function runBuild(root?: string) {
  printBanner();

  const project = await loadProject({ cwd: process.cwd(), root });
  const snapshot = await scanProject(project);

  const startTime = performance.now();
  const builderConfig = createBuilderConfig(project, "production", snapshot);
  const builder = await createBuilder(builderConfig);
  fs.rmSync(project.outputDir, { recursive: true, force: true });
  await buildApp(fs, builder);
  if (!isWebApp(project.outputDir)) {
    project.gas.webapp = undefined;
  }
  generateGASManifest(project.outputDir, project.gas);
  const endTime = performance.now();

  const artifacts = collectArtifacts(project.outputDir);
  artifacts.sort((a, b) => a.path.localeCompare(b.path));

  printReport(project, artifacts, endTime - startTime);
}
