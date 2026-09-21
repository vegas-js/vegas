import { ArtifactStore } from "../../build";
import { startDevApplication } from "../../dev/application";
import { replaceDevBuildArtifacts } from "../../dev/build-artifacts";
import { buildDevTopology } from "../../dev/build-topology";
import { ReloadableRuntimeBackend } from "../../dev/reloadable-runtime-backend";
import { createRuntimeProgram } from "../../dev/runtime-program";
import { loadProject, scanRuntimeDataSources } from "../../project";
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

  const getProgram = () => createRuntimeProgram(artifacts);
  const createRuntime = (runtimeDataSources: readonly string[]) =>
    createLocalRuntime(project, runtimeDataSources, getProgram);
  const initialRuntime = await createRuntime(topology.snapshot.runtimeDataSources);
  const runtime = new ReloadableRuntimeBackend(initialRuntime.backend);
  const reloadRuntime = async (): Promise<void> => {
    const runtimeDataSources = await scanRuntimeDataSources(project);
    const nextRuntime = await createRuntime(runtimeDataSources);
    runtime.replace(nextRuntime.backend);
  };

  await startDevApplication({
    project,
    artifacts,
    builder: topology.builder,
    runtime,
    reloadRuntime,
    mode,
  });
}
