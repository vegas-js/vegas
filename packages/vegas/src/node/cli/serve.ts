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
import { createServeContext } from "./core/context";
import { createLegacyAppsScriptExecutor } from "./core/launch";
import { loadRuntimeData } from "./core/runtime-data";
import { createLegacyInvocationEnvironment } from "./core/runtime-environment";
import { createLegacyInvocationScope } from "./core/runtime-scope";

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

  const ctx = createServeContext(project, artifacts);

  const scope = createLegacyInvocationScope(ctx);
  const cacheStore = new InMemoryCacheStore();
  const lockStore = new InMemoryLockStore();
  const propertiesStore = new InMemoryPropertiesStore();
  const driveStore = new InMemoryDriveStore();
  const driveIteratorStore = new InMemoryDriveIteratorStore();
  const spreadsheetStore = new InMemorySpreadsheetStore();

  await loadRuntimeData(ctx, snapshot.runtimeDataSources, propertiesStore, scope);

  const environment = createLegacyInvocationEnvironment(ctx);
  const executor = createLegacyAppsScriptExecutor(
    ctx,
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
