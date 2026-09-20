import type { ViteBuilder } from "vite";

import { buildApp, createProjectBuilder } from "../build";
import { type ProjectSnapshot, type ResolvedProject, scanProject } from "../project";
import type { DevBuildArtifacts } from "./build-artifacts";

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
