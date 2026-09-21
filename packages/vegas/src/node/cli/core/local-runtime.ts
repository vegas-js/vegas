import type { ResolvedProject } from "../../project";
import {
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  LocalRuntimeSession,
  type LocalRuntime,
  type Program,
} from "../../runtime";
import { createNodeAppsScriptExecutor } from "../../runtime/node";
import type { SpreadsheetUrlCapability } from "../../runtime/spreadsheet-url-capability";
import { applyPropertiesRuntimeData, loadRuntimeDataSnapshot } from "./runtime-data";
import { createInvocationEnvironment } from "./runtime-environment";
import { createInvocationScope } from "./runtime-scope";

interface LocalRuntimeOptions {
  readonly session?: LocalRuntimeSession;
  readonly spreadsheetUrlCapability?: SpreadsheetUrlCapability;
}

interface LocalRuntimeDependencies {
  readonly loadRuntimeDataSnapshot?: typeof loadRuntimeDataSnapshot;
  readonly createExecutor?: typeof createNodeAppsScriptExecutor;
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
  const loadSnapshot = dependencies.loadRuntimeDataSnapshot ?? loadRuntimeDataSnapshot;
  const snapshot = await loadSnapshot(project.root, runtimeDataSources);

  if (snapshot.properties !== undefined) {
    await applyPropertiesRuntimeData(propertiesStore, scope, snapshot.properties.value);
  }

  const spreadsheetStore = new InMemorySpreadsheetStore(
    snapshot.spreadsheets.map(({ value }) => value),
  );
  const runtimeSession = options.session ?? new LocalRuntimeSession();
  const createExecutor = dependencies.createExecutor ?? createNodeAppsScriptExecutor;
  const executor = createExecutor({
    ...runtimeSession.stores,
    propertiesStore,
    spreadsheetStore,
    spreadsheetUrlCapability: options.spreadsheetUrlCapability,
  });
  const environment = createInvocationEnvironment(project, snapshot.session?.value);

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
