import { createBuilder } from "vite";

import { ArtifactStore, buildApp, createBuilderConfig, createBuildPlan } from "../build";
import { DevApplication } from "../dev/application";
import { loadProject, scanProject } from "../project";
import { createServeContext } from "./core/context";
import { createLegacyGasExecutor } from "./core/launch";
import { loadMock } from "./core/mock";

export async function runServe(root?: string) {
  const project = await loadProject({ cwd: process.cwd(), root });
  const snapshot = await scanProject(project);

  const plan = createBuildPlan(project, snapshot, "development");
  const builderConfig = createBuilderConfig(plan);
  const builder = await createBuilder(builderConfig);

  const [clientArtifacts, serverArtifacts] = await Promise.all([
    buildApp(builder, /^client\d+$/),
    buildApp(builder, /^server$/),
  ]);

  const artifacts = new ArtifactStore();
  artifacts.replaceScope("client", clientArtifacts);
  artifacts.replaceScope("server", serverArtifacts);

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
