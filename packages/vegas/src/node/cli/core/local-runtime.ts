import type { ResolvedProject } from "../../project";
import {
  InMemoryCacheStore,
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  InMemoryLockStore,
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  type CacheStore,
  type DriveIteratorStore,
  type DriveStore,
  type LocalRuntime,
  type LockStore,
  type Program,
} from "../../runtime";
import { createNodeAppsScriptExecutor } from "../../runtime/node";
import type { SpreadsheetUrlCapability } from "../../runtime/spreadsheet-url-capability";
import { loadRuntimeData } from "./runtime-data";
import { createInvocationEnvironment } from "./runtime-environment";
import { createInvocationScope } from "./runtime-scope";

export interface LocalRuntimeSharedStores {
  readonly cacheStore: CacheStore;
  readonly driveIteratorStore: DriveIteratorStore;
  readonly driveStore: DriveStore;
  readonly lockStore: LockStore;
}

interface LocalRuntimeOptions {
  readonly sharedStores?: LocalRuntimeSharedStores;
  readonly spreadsheetUrlCapability?: SpreadsheetUrlCapability;
}

interface LocalRuntimeDependencies {
  readonly loadRuntimeData?: typeof loadRuntimeData;
  readonly createExecutor?: typeof createNodeAppsScriptExecutor;
}

export function createLocalRuntimeSharedStores(): LocalRuntimeSharedStores {
  return {
    cacheStore: new InMemoryCacheStore(),
    driveIteratorStore: new InMemoryDriveIteratorStore(),
    driveStore: new InMemoryDriveStore(),
    lockStore: new InMemoryLockStore(),
  };
}

export async function createLocalRuntime(
  project: ResolvedProject,
  runtimeDataSources: readonly string[],
  getProgram: () => Program,
  options: LocalRuntimeOptions = {},
  dependencies: LocalRuntimeDependencies = {},
): Promise<LocalRuntime> {
  const scope = createInvocationScope(project);
  const propertiesStore = new InMemoryPropertiesStore();
  const load = dependencies.loadRuntimeData ?? loadRuntimeData;
  const runtimeData = await load(project.root, runtimeDataSources, propertiesStore, scope);
  const spreadsheetStore = new InMemorySpreadsheetStore(runtimeData.spreadsheets);
  const sharedStores = options.sharedStores ?? createLocalRuntimeSharedStores();
  const createExecutor = dependencies.createExecutor ?? createNodeAppsScriptExecutor;
  const executor = createExecutor({
    ...sharedStores,
    propertiesStore,
    spreadsheetStore,
    spreadsheetUrlCapability: options.spreadsheetUrlCapability,
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
    resources: {
      spreadsheets: spreadsheetStore,
    },
  };
}
