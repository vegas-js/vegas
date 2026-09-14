import vfs from "@platformatic/vfs";
import { createBuilder } from "vite";

import { loadProject, scanProject } from "../project";
import { buildApp, createBuilderConfig } from "./core/build";
import { createServeContext } from "./core/context";
import { loadMock } from "./core/mock";
import { serveApp } from "./core/serve";

export async function runPreview(root?: string) {
  const project = await loadProject({ cwd: process.cwd(), root });
  const snapshot = await scanProject(project);

  const builderConfig = createBuilderConfig(project, "production", snapshot);
  const builder = await createBuilder(builderConfig);
  using mvfs = vfs.create();
  await buildApp(mvfs, builder);
  const ctx = createServeContext(project, mvfs);
  await loadMock(ctx, snapshot.gasMockSources);

  await serveApp(ctx, builder);
}
