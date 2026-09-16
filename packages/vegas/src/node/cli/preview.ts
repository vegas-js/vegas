import { ArtifactStore } from "../build";
import { DevApplication } from "../dev/application";
import { buildDevTopology } from "../dev/build-topology";
import { loadProject } from "../project";
import { createServeContext } from "./core/context";
import { createLegacyGasExecutor } from "./core/launch";
import { loadRuntimeData } from "./core/runtime-data";

export async function runPreview(root?: string) {
  const project = await loadProject({
    cwd: process.cwd(),
    root,
  });
  const { snapshot, builder, clientArtifacts, serverArtifacts } = await buildDevTopology(
    project,
    "production",
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

  const executor = createLegacyGasExecutor(ctx);

  const application = new DevApplication({
    project,
    artifacts,
    builder,
    executor,
    mode: "production",
  });

  await application.start();
}
