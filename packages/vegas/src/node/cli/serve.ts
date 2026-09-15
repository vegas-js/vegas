import { ArtifactStore } from "../build";
import { DevApplication } from "../dev/application";
import { buildDevTopology } from "../dev/build-topology";
import { loadProject } from "../project";
import { createServeContext } from "./core/context";
import { createLegacyGasExecutor } from "./core/launch";
import { loadMock } from "./core/mock";

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
    mode: "development",
  });

  await application.start();
}
