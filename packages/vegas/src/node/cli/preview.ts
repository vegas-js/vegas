import { ArtifactStore } from "../build";
import { DevApplication } from "../dev/application";
import { buildDevTopology } from "../dev/build-topology";
import { loadProject } from "../project";
import { createServeContext } from "./core/context";
import { createLegacyGasExecutor } from "./core/launch";
import { loadMock } from "./core/mock";

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
  await loadMock(ctx, snapshot.gasMockSources);

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
