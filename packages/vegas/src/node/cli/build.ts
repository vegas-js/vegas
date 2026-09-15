import fs from "node:fs";

import { createBuilder } from "vite";

import { buildApp, createBuilderConfig, createBuildPlan, writeArtifacts } from "../build";
import { loadProject, scanProject } from "../project";
import { isWebApp } from "./core/analyze";
import { printBanner } from "./core/banner";
import { generateGASManifest } from "./core/manifest";
import { collectArtifacts, printReport } from "./core/printReport";

export async function runBuild(root?: string) {
  printBanner();

  const project = await loadProject({ cwd: process.cwd(), root });
  const snapshot = await scanProject(project);

  const startTime = performance.now();
  const plan = createBuildPlan(project, snapshot, "production");
  const builderConfig = createBuilderConfig(plan);
  const builder = await createBuilder(builderConfig);
  fs.rmSync(project.outputDir, {
    recursive: true,
    force: true,
  });

  const buildArtifacts = await buildApp(builder);

  await writeArtifacts(project.outputDir, buildArtifacts);

  if (!isWebApp(project.outputDir)) {
    project.gas.webapp = undefined;
  }
  generateGASManifest(project.outputDir, project.gas);
  const endTime = performance.now();

  const reportArtifacts = collectArtifacts(project.outputDir);
  reportArtifacts.sort((a, b) => a.path.localeCompare(b.path));

  printReport(project, reportArtifacts, endTime - startTime);
}
