import { ArtifactStore } from "../../build";
import { startDevApplication } from "../../dev/application";
import { replaceDevBuildArtifacts } from "../../dev/build-artifacts";
import { buildDevTopology } from "../../dev/build-topology";
import { ReloadableLocalRuntime } from "../../dev/reloadable-local-runtime";
import { createRuntimeProgram } from "../../dev/runtime-program";
import { LocalSpreadsheetUrlResolver } from "../../dev/webapp/local-spreadsheet-url";
import { createGoogleAppsScriptUserRuntime } from "../../google-apps-script-runtime-factory";
import { createLocalRuntime } from "../../local-runtime-factory";
import { loadProject, scanRuntimeDataSources, type ResolvedProject } from "../../project";
import type { LocalRuntimeSession, RuntimeBackend } from "../../runtime";
import { reconcileLocalRuntimeSession } from "../../runtime-data-reconcile";
import { resetLocalRuntimeSession } from "../../runtime-data-reset";
import { createInvocationScope } from "../../runtime-scope";
import { loadRuntimeDataSnapshot } from "./runtime-data";

type DevApplicationMode = "development" | "production";

function createServerFunctionRuntime(project: ResolvedProject): RuntimeBackend | undefined {
  const serverFunctions = project.appsScript.serverFunctions;

  if (serverFunctions.backend === "local") {
    return undefined;
  }

  const scriptId = project.appsScript.scriptId;
  if (scriptId === undefined) {
    throw new Error(
      "Resolved Apps Script project is missing a script id for Google server functions.",
    );
  }

  return createGoogleAppsScriptUserRuntime({
    scriptId,
    profile: serverFunctions.profile,
    requiredScopes: project.appsScript.manifest.oauthScopes,
    devMode: serverFunctions.devMode,
  });
}

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
  const serverFunctionRuntime = createServerFunctionRuntime(project);
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
    serverFunctionRuntime,
    getLocalSpreadsheetStore: () => currentSession.stores.spreadsheetStore,
    reloadRuntime,
    localSpreadsheetUrls,
    mode,
  });
}
