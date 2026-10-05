import type { ViteBuilder } from "vite";

import { buildDevArtifacts, createProjectBuilder, type DevBuildArtifacts } from "../build";
import { type ProjectSnapshot, type ResolvedProject, scanProject } from "../project";

export interface DevBuildTopology extends DevBuildArtifacts {
  readonly snapshot: ProjectSnapshot;
  readonly builder: ViteBuilder;
}

export async function buildDevTopology(
  project: ResolvedProject,
  mode: "development" | "production",
): Promise<DevBuildTopology> {
  const snapshot = await scanProject(project);
  const builder = await createProjectBuilder(project, snapshot, mode);

  const artifacts = await buildDevArtifacts(builder);

  return {
    snapshot,
    builder,
    ...artifacts,
  };
}
