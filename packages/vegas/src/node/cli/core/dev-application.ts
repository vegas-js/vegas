import { ArtifactStore } from "../../build";
import { startDevApplication } from "../../dev/application";
import { replaceDevBuildArtifacts } from "../../dev/build-artifacts";
import { buildDevTopology } from "../../dev/build-topology";
import { ReloadableLocalRuntime } from "../../dev/reloadable-local-runtime";
import { createRuntimeProgram } from "../../dev/runtime-program";
import { LocalSpreadsheetUrlResolver } from "../../dev/webapp/local-spreadsheet-url";
import { createLocalRuntime } from "../../local-runtime-factory";
import { loadProject, scanRuntimeDataSources } from "../../project";
import type { LocalRuntimeSession } from "../../runtime";
import { reconcileLocalRuntimeSession } from "../../runtime-data-reconcile";
import { resetLocalRuntimeSession } from "../../runtime-data-reset";
import { createInvocationScope } from "../../runtime-scope";
import { loadRuntimeDataSnapshot } from "./runtime-data";

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
  const runtimeScope = createInvocationScope(project);
  let currentSnapshot = await loadRuntimeDataSnapshot(
    project.root,
    topology.snapshot.runtimeDataSources,
  );
  let currentSession = await resetLocalRuntimeSession(runtimeScope, currentSnapshot);
  const createRuntime = (snapshot: typeof currentSnapshot, session: LocalRuntimeSession) =>
    createLocalRuntime(project, snapshot, getProgram, {
      session,
      spreadsheetUrlCapability: localSpreadsheetUrls,
    });
  const initialRuntime = await createRuntime(currentSnapshot, currentSession);
  const runtime = new ReloadableLocalRuntime(initialRuntime);
  const reloadRuntime = async (): Promise<void> => {
    const runtimeDataSources = await scanRuntimeDataSources(project);
    const nextSnapshot = await loadRuntimeDataSnapshot(project.root, runtimeDataSources);
    const nextSession = await reconcileLocalRuntimeSession(
      currentSession,
      runtimeScope,
      currentSnapshot,
      nextSnapshot,
    );
    const nextRuntime = await createRuntime(nextSnapshot, nextSession);

    runtime.replace(nextRuntime);
    currentSnapshot = nextSnapshot;
    currentSession = nextSession;
  };

  await startDevApplication({
    project,
    artifacts,
    builder: topology.builder,
    runtime,
    getLocalSpreadsheetStore: () => currentSession.stores.spreadsheetStore,
    reloadRuntime,
    localSpreadsheetUrls,
    mode,
  });
}
