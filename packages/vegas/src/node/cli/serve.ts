import { ArtifactStore } from "../build";
import { DevApplication } from "../dev/application";
import { buildDevTopology } from "../dev/build-topology";
import { loadProject } from "../project";
import {
  InMemoryCacheStore,
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  InMemoryLockStore,
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
} from "../runtime";
import { createNodeAppsScriptExecutor } from "./core/apps-script-executor";
import { loadRuntimeData } from "./core/runtime-data";
import { createInvocationEnvironment } from "./core/runtime-environment";
import { createInvocationScope } from "./core/runtime-scope";

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

  const scope = createInvocationScope(project);
  const cacheStore = new InMemoryCacheStore();
  const lockStore = new InMemoryLockStore();
  const propertiesStore = new InMemoryPropertiesStore();
  const driveStore = new InMemoryDriveStore();
  const driveIteratorStore = new InMemoryDriveIteratorStore();

  const runtimeData = await loadRuntimeData(
    project.root,
    snapshot.runtimeDataSources,
    propertiesStore,
    scope,
  );

  const spreadsheetStore = new InMemorySpreadsheetStore(runtimeData.spreadsheets);
  const environment = createInvocationEnvironment(project, runtimeData.session);
  const executor = createNodeAppsScriptExecutor(
    cacheStore,
    lockStore,
    propertiesStore,
    driveStore,
    driveIteratorStore,
    spreadsheetStore,
  );

  const application = new DevApplication({
    project,
    artifacts,
    builder,
    executor,
    environment,
    scope,
    mode: "development",
  });

  await application.start();
}
