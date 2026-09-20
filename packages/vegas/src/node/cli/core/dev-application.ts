import { ArtifactStore } from "../../build";
import { startDevApplication } from "../../dev/application";
import { replaceDevBuildArtifacts } from "../../dev/build-artifacts";
import { buildDevTopology } from "../../dev/build-topology";
import { ReloadableRuntimeBackend } from "../../dev/reloadable-runtime-backend";
import { createRuntimeProgram } from "../../dev/runtime-program";
import { loadProject } from "../../project";
import { createLocalRuntime } from "./local-runtime";

type DevApplicationMode = "development" | "production";

export async function runDevApplication(mode: DevApplicationMode, root?: string): Promise<void> {
  const project = await loadProject({
    cwd: process.cwd(),
    root,
  });

  const topology = await buildDevTopology(project, mode);

  const artifacts = new ArtifactStore();
  replaceDevBuildArtifacts(artifacts, topology);

  const runtime = new ReloadableRuntimeBackend(
    await createLocalRuntime(project, topology.snapshot.runtimeDataSources, () =>
      createRuntimeProgram(artifacts),
    ),
  );

  await startDevApplication({
    project,
    artifacts,
    builder: topology.builder,
    runtime,
    mode,
  });
}
