import { createBuilder, type ViteBuilder } from "vite";

import { type BuildArtifact, buildApp, createBuilderConfig, createBuildPlan } from "../build";
import { type ProjectSnapshot, type ResolvedProject, scanProject } from "../project";

export interface DevBuildTopology {
  readonly snapshot: ProjectSnapshot;
  readonly builder: ViteBuilder;
  readonly clientArtifacts: readonly BuildArtifact[];
  readonly serverArtifacts: readonly BuildArtifact[];
}

export async function buildDevTopology(
  project: ResolvedProject,
  mode: "development" | "production",
): Promise<DevBuildTopology> {
  const snapshot = await scanProject(project);
  const plan = createBuildPlan(project, snapshot, mode);
  const builder = await createBuilder(createBuilderConfig(plan));

  const [clientArtifacts, serverArtifacts] = await Promise.all([
    buildApp(builder, /^client\d+$/),
    buildApp(builder, /^server$/),
  ]);

  return {
    snapshot,
    builder,
    clientArtifacts,
    serverArtifacts,
  };
}
