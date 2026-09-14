import vfs from "@platformatic/vfs";
import { createBuilder } from "vite";

import { collectSources, createClientEntries, loadProject } from "../project";
import { buildApp, createBuilderConfig } from "./core/build";
import { createServeContext } from "./core/context";
import { loadMock } from "./core/mock";
import { serveApp } from "./core/serve";

export async function runPreview(root?: string) {
  const project = await loadProject({ cwd: process.cwd(), root });
  const projectSource = await collectSources(project);
  const clientEntries =
    project.appType === "spa"
      ? createClientEntries(project.clientDir, projectSource.clientSources)
      : [];

  const builderConfig = createBuilderConfig(project, "production", projectSource, clientEntries);
  const builder = await createBuilder(builderConfig);
  using mvfs = vfs.create();
  await buildApp(mvfs, builder);
  const ctx = createServeContext(project, mvfs);
  await loadMock(ctx, projectSource.gasMockSources);

  await serveApp(ctx, builder);
}
