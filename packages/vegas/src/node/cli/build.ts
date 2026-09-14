import fs from "node:fs";

import { createBuilder } from "vite";

import { loadProject } from "../project";
import { collectSources, detectClientEntries, isWebApp } from "./core/analyze";
import { buildApp, createBuilderConfig, printBanner } from "./core/build";
import { generateGASManifest } from "./core/manifest";
import { collectArtifacts, printReport } from "./core/printReport";

export async function runBuild(root?: string) {
  printBanner();

  const project = await loadProject({ cwd: process.cwd(), root });
  const projectSource = await collectSources(project);
  const clientEntries =
    project.appType === "spa" ? detectClientEntries(projectSource.clientSources) : [];

  const startTime = performance.now();
  const builderConfig = createBuilderConfig(project, "production", projectSource, clientEntries);
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
