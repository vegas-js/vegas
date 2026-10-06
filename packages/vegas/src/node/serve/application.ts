import { ArtifactStore, buildDevTopology, replaceDevBuildArtifacts } from "../build";
import { createGoogleAppsScriptUserRuntime } from "../google-apps-script-runtime";
import {
  createInvocationScope,
  createLocalRuntime,
  reconcileLocalRuntimeSession,
  ReloadableLocalRuntime,
  resetLocalRuntimeSession,
  LocalRuntimeSession,
} from "../local-runtime";
import { loadProject, scanRuntimeDataSources, type ResolvedProject } from "../project";
import type { RuntimeBackend } from "../runtime";
import { createRuntimeProgram } from "../runtime-program";
import { loadRuntimeDataSnapshot } from "./runtime-data";
import { startDevApplication } from "./server";
import { LocalSpreadsheetUrlResolver } from "./webapp/local-spreadsheet/local-spreadsheet-url";

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
