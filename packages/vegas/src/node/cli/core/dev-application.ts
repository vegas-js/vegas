import { ArtifactStore } from "../../build";
import { startDevApplication } from "../../dev/application";
import { replaceDevBuildArtifacts } from "../../dev/build-artifacts";
import { buildDevTopology } from "../../dev/build-topology";
import { ReloadableLocalRuntime } from "../../dev/reloadable-local-runtime";
import { createRuntimeProgram } from "../../dev/runtime-program";
import { LocalSpreadsheetUrlResolver } from "../../dev/webapp/local-spreadsheet-url";
import { loadProject, scanRuntimeDataSources } from "../../project";
import { createLocalRuntime, createLocalRuntimeSharedStores } from "./local-runtime";

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
  const localSpreadsheetUrls = new LocalSpreadsheetUrlResolver();
  const sharedStores = createLocalRuntimeSharedStores();
  const createRuntime = (runtimeDataSources: readonly string[]) =>
    createLocalRuntime(project, runtimeDataSources, getProgram, {
      sharedStores,
      spreadsheetUrlCapability: localSpreadsheetUrls,
    });
  const initialRuntime = await createRuntime(topology.snapshot.runtimeDataSources);
  const runtime = new ReloadableLocalRuntime(initialRuntime);
  const reloadRuntime = async (): Promise<void> => {
    const runtimeDataSources = await scanRuntimeDataSources(project);
    const nextRuntime = await createRuntime(runtimeDataSources);
    runtime.replace(nextRuntime);
  };

  await startDevApplication({
    project,
    artifacts,
    builder: topology.builder,
    runtime,
    getLocalSpreadsheetStore: () => runtime.resources.spreadsheets,
    reloadRuntime,
    localSpreadsheetUrls,
    mode,
  });
}
