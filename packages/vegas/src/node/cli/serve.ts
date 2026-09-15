import vfs from "@platformatic/vfs";
import { createBuilder } from "vite";

import { buildApp, createBuilderConfig, createBuildPlan } from "../build";
import { loadProject, scanProject } from "../project";
import { createServeContext } from "./core/context";
import { loadMock } from "./core/mock";
import { serveApp } from "./core/serve";

export async function runServe(root?: string) {
  const project = await loadProject({ cwd: process.cwd(), root });
  const snapshot = await scanProject(project);

  const plan = createBuildPlan(project, snapshot, "development");
  const builderConfig = createBuilderConfig(plan);
  const builder = await createBuilder(builderConfig);
  using mvfs = vfs.create();
  await buildApp(builder);
  const ctx = createServeContext(project, mvfs);
  await loadMock(ctx, snapshot.gasMockSources);

  await serveApp(ctx, builder);
}
