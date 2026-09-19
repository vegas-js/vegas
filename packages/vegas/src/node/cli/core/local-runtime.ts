import type { ResolvedProject } from "../../project";
import {
  InMemoryCacheStore,
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  InMemoryLockStore,
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  type Executor,
  type InvocationEnvironment,
  type InvocationScope,
} from "../../runtime";
import { createNodeAppsScriptExecutor } from "./apps-script-executor";
import { loadRuntimeData } from "./runtime-data";
import { createInvocationEnvironment } from "./runtime-environment";
import { createInvocationScope } from "./runtime-scope";

export interface LocalRuntime {
  readonly executor: Executor;
  readonly environment: InvocationEnvironment;
  readonly scope: InvocationScope;
}

export async function createLocalRuntime(
  project: ResolvedProject,
  runtimeDataSources: readonly string[],
  load: typeof loadRuntimeData = loadRuntimeData,
): Promise<LocalRuntime> {
  const scope = createInvocationScope(project);
  const propertiesStore = new InMemoryPropertiesStore();
  const runtimeData = await load(project.root, runtimeDataSources, propertiesStore, scope);

  return {
    executor: createNodeAppsScriptExecutor({
      cacheStore: new InMemoryCacheStore(),
      driveIteratorStore: new InMemoryDriveIteratorStore(),
      driveStore: new InMemoryDriveStore(),
      lockStore: new InMemoryLockStore(),
      propertiesStore,
      spreadsheetStore: new InMemorySpreadsheetStore(runtimeData.spreadsheets),
    }),
    environment: createInvocationEnvironment(project, runtimeData.session),
    scope,
  };
}
