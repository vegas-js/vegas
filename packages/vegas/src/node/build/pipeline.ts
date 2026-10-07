import type { ProjectSnapshot, ResolvedProject } from "../project";
import type { BuildArtifact } from "./artifact";
import { createProjectBuilder } from "./builder";
import { createAppsScriptManifestArtifact } from "./manifest";
import { buildApp, isWebApp } from "./vite";

export async function buildProjectArtifacts(
  project: ResolvedProject,
  snapshot: ProjectSnapshot,
): Promise<BuildArtifact[]> {
  const builder = await createProjectBuilder(project, snapshot, "production");

  const buildArtifacts = await buildApp(builder);
  const manifestArtifact = createAppsScriptManifestArtifact(
    project.appsScript.manifest,
    isWebApp(buildArtifacts),
  );

  return [...buildArtifacts, manifestArtifact];
}
