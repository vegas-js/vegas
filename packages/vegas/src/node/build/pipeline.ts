import { createBuilder } from "vite";

import type { ProjectSnapshot, ResolvedProject } from "../project";
import type { BuildArtifact } from "./artifact";
import { createAppsScriptManifestArtifact } from "./manifest";
import { createBuildPlan } from "./plan";
import { buildApp, createBuilderConfig, isWebApp } from "./vite";

export async function buildProjectArtifacts(
  project: ResolvedProject,
  snapshot: ProjectSnapshot,
): Promise<BuildArtifact[]> {
  const plan = createBuildPlan(project, snapshot, "production");
  const builder = await createBuilder(createBuilderConfig(plan));

  const buildArtifacts = await buildApp(builder);
  const manifestArtifact = createAppsScriptManifestArtifact(
    project.appsScript.manifest,
    isWebApp(buildArtifacts),
  );

  return [...buildArtifacts, manifestArtifact];
}
