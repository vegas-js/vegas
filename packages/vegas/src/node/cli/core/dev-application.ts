import { ArtifactStore } from "../../build";
import { startDevApplication } from "../../dev/application";
import { replaceDevBuildArtifacts } from "../../dev/build-artifacts";
import { buildDevTopology } from "../../dev/build-topology";
import { ReloadableLocalRuntime } from "../../dev/reloadable-local-runtime";
import { createRuntimeProgram } from "../../dev/runtime-program";
import { LocalSpreadsheetUrlResolver } from "../../dev/webapp/local-spreadsheet-url";
import { loadProject, scanRuntimeDataSources } from "../../project";
import {
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  LocalRuntimeSession,
} from "../../runtime";
import {
  reconcileLocalPropertiesStore,
  reconcileLocalSpreadsheetStore,
} from "../../runtime-data-reconcile";
import { createLocalRuntime } from "./local-runtime";
import { loadRuntimeDataSnapshot } from "./runtime-data";
import { createInvocationScope } from "./runtime-scope";

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
  const runtimeSession = new LocalRuntimeSession();
  const runtimeScope = createInvocationScope(project);
  let currentSnapshot = await loadRuntimeDataSnapshot(
    project.root,
    topology.snapshot.runtimeDataSources,
  );
  let currentPropertiesStore = await reconcileLocalPropertiesStore(
    new InMemoryPropertiesStore(),
    runtimeScope,
    { spreadsheets: [] },
    currentSnapshot,
  );
  let currentSpreadsheetStore = new InMemorySpreadsheetStore(
    currentSnapshot.spreadsheets.map(({ value }) => value),
  );
  const createRuntime = (
    snapshot: typeof currentSnapshot,
    propertiesStore: InMemoryPropertiesStore,
    spreadsheetStore: InMemorySpreadsheetStore,
  ) =>
    createLocalRuntime(project, snapshot, getProgram, {
      propertiesStore,
      session: runtimeSession,
      spreadsheetStore,
      spreadsheetUrlCapability: localSpreadsheetUrls,
    });
  const initialRuntime = await createRuntime(
    currentSnapshot,
    currentPropertiesStore,
    currentSpreadsheetStore,
  );
  const runtime = new ReloadableLocalRuntime(initialRuntime);
  const reloadRuntime = async (): Promise<void> => {
    const runtimeDataSources = await scanRuntimeDataSources(project);
    const nextSnapshot = await loadRuntimeDataSnapshot(project.root, runtimeDataSources);
    const nextPropertiesStore = await reconcileLocalPropertiesStore(
      currentPropertiesStore,
      runtimeScope,
      currentSnapshot,
      nextSnapshot,
    );
    const nextSpreadsheetStore = reconcileLocalSpreadsheetStore(
      currentSpreadsheetStore,
      currentSnapshot,
      nextSnapshot,
    );
    const nextRuntime = await createRuntime(
      nextSnapshot,
      nextPropertiesStore,
      nextSpreadsheetStore,
    );

    runtime.replace(nextRuntime);
    currentSnapshot = nextSnapshot;
    currentPropertiesStore = nextPropertiesStore;
    currentSpreadsheetStore = nextSpreadsheetStore;
  };

  await startDevApplication({
    project,
    artifacts,
    builder: topology.builder,
    runtime,
    getLocalSpreadsheetStore: () => currentSpreadsheetStore,
    reloadRuntime,
    localSpreadsheetUrls,
    mode,
  });
}
