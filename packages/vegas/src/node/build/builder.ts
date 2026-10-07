import { createBuilder, type ViteBuilder } from "vite";

import type { ProjectSnapshot, ResolvedProject } from "../project";
import type { BuildPlan } from "./plan";
import { createBuildPlan } from "./plan";
import { createBuilderConfig } from "./vite";

export function createProjectBuilder(
  project: ResolvedProject,
  snapshot: ProjectSnapshot,
  mode: BuildPlan["mode"],
): Promise<ViteBuilder> {
  const plan = createBuildPlan(project, snapshot, mode);
  return createBuilder(createBuilderConfig(plan));
}
