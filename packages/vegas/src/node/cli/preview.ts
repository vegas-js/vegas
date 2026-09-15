import { createBuilder } from "vite";

import { ArtifactStore, buildApp, createBuilderConfig, createBuildPlan } from "../build";
import { DevApplication } from "../dev/application";
import { loadProject, scanProject } from "../project";
import { createServeContext } from "./core/context";
import { createLegacyGasExecutor } from "./core/launch";
import { loadMock } from "./core/mock";

export async function runPreview(root?: string) {
  const project = await loadProject({ cwd: process.cwd(), root });
  const snapshot = await scanProject(project);

  const plan = createBuildPlan(project, snapshot, "production");
  const builderConfig = createBuilderConfig(plan);
  const builder = await createBuilder(builderConfig);

  const artifacts = new ArtifactStore(await buildApp(builder));

  const ctx = createServeContext(project, artifacts);
  await loadMock(ctx, snapshot.gasMockSources);

  const executor = createLegacyGasExecutor(ctx);

  const application = new DevApplication({
    project,
    artifacts,
    builder,
    executor,
    mode: plan.mode,
  });

  await application.start();
}
