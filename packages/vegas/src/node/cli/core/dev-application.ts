import { ArtifactStore } from "../../build";
import { startDevApplication } from "../../dev/application";
import { buildDevTopology } from "../../dev/build-topology";
import { loadProject } from "../../project";
import { createLocalRuntime } from "./local-runtime";

type DevApplicationMode = "development" | "production";

export async function runDevApplication(mode: DevApplicationMode, root?: string): Promise<void> {
  const project = await loadProject({
    cwd: process.cwd(),
    root,
  });

  const { snapshot, builder, clientArtifacts, serverArtifacts } = await buildDevTopology(
    project,
    mode,
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

  const { executor, environment, scope } = await createLocalRuntime(
    project,
    snapshot.runtimeDataSources,
  );

  await startDevApplication({
    project,
    artifacts,
    builder,
    executor,
    environment,
    scope,
    mode,
  });
}
