import type { ResolvedProject } from "../../project";
import {
  InMemoryCacheStore,
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  InMemoryLockStore,
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  type Program,
  type RuntimeBackend,
} from "../../runtime";
import { createNodeAppsScriptExecutor } from "../../runtime/node";
import { loadRuntimeData } from "./runtime-data";
import { createInvocationEnvironment } from "./runtime-environment";
import { createInvocationScope } from "./runtime-scope";

interface LocalRuntimeDependencies {
  readonly loadRuntimeData?: typeof loadRuntimeData;
  readonly createExecutor?: typeof createNodeAppsScriptExecutor;
}

export async function createLocalRuntime(
  project: ResolvedProject,
  runtimeDataSources: readonly string[],
  getProgram: () => Program,
  dependencies: LocalRuntimeDependencies = {},
): Promise<RuntimeBackend> {
  const scope = createInvocationScope(project);
  const propertiesStore = new InMemoryPropertiesStore();
  const load = dependencies.loadRuntimeData ?? loadRuntimeData;
  const runtimeData = await load(project.root, runtimeDataSources, propertiesStore, scope);
  const createExecutor = dependencies.createExecutor ?? createNodeAppsScriptExecutor;
  const executor = createExecutor({
    cacheStore: new InMemoryCacheStore(),
    driveIteratorStore: new InMemoryDriveIteratorStore(),
    driveStore: new InMemoryDriveStore(),
    lockStore: new InMemoryLockStore(),
    propertiesStore,
    spreadsheetStore: new InMemorySpreadsheetStore(runtimeData.spreadsheets),
  });
  const environment = createInvocationEnvironment(project, runtimeData.session);

  return {
    execute(request) {
      return executor.execute({
        ...request,
        program: getProgram(),
        environment,
        scope,
      });
    },
  };
}
