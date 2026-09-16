import fs from "node:fs";

import { createBuilder } from "vite";

import {
  buildApp,
  createBuilderConfig,
  createBuildPlan,
  createGASManifestArtifact,
  isWebApp,
  writeArtifacts,
} from "../build";
import { loadProject, scanProject } from "../project";
import { printBanner } from "./core/banner";
import { printReport } from "./core/printReport";

export async function runBuild(root?: string) {
  printBanner();

  const project = await loadProject({
    cwd: process.cwd(),
    root,
  });

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
  const manifestArtifact = createGASManifestArtifact(
    project.appsScript.manifest,
    isWebApp(buildArtifacts),
  );
  const artifacts = [...buildArtifacts, manifestArtifact];

  await writeArtifacts(project.outputDir, artifacts);

  const endTime = performance.now();

  printReport(project, artifacts, endTime - startTime);
}
