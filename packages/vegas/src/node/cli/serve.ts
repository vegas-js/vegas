import { ArtifactStore } from "../build";
import { DevApplication } from "../dev/application";
import { buildDevTopology } from "../dev/build-topology";
import { loadProject } from "../project";
import { createServeContext } from "./core/context";
import { createLegacyAppsScriptExecutor } from "./core/launch";
import { loadRuntimeData } from "./core/runtime-data";
import { createLegacyInvocationEnvironment } from "./core/runtime-environment";

export async function runServe(root?: string) {
  const project = await loadProject({
    cwd: process.cwd(),
    root,
  });

  const { snapshot, builder, clientArtifacts, serverArtifacts } = await buildDevTopology(
    project,
    "development",
  );

  const artifacts = new ArtifactStore();
  artifacts.replaceScopes([
    {
      scope: "client",
      artifacts: clientArtifacts,
    },
    {
      scope: "server",
      artifacts: serverArtifacts,
    },
  ]);

  const ctx = createServeContext(project, artifacts);

  await loadRuntimeData(ctx, snapshot.runtimeDataSources);

  const environment = createLegacyInvocationEnvironment(ctx);
  const executor = createLegacyAppsScriptExecutor(ctx);

  const application = new DevApplication({
    project,
    artifacts,
    builder,
    executor,
    environment,
    mode: "development",
  });

  await application.start();
}
