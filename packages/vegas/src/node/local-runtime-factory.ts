import type { RuntimeDataSnapshot } from "../shared/gas";
import type { LocalRuntimeProject } from "./local-runtime-project";
import {
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  LocalRuntimeSession,
  type LocalRuntime,
  type Program,
} from "./runtime";
import { applyPropertiesRuntimeData } from "./runtime-data-properties";
import { createInvocationEnvironment } from "./runtime-environment";
import { createInvocationScope } from "./runtime-scope";
import { createNodeAppsScriptExecutor } from "./runtime/node";
import type { SpreadsheetUrlCapability } from "./runtime/spreadsheet-url-capability";

interface LocalRuntimeOptions {
  readonly propertiesStore?: InMemoryPropertiesStore;
  readonly session?: LocalRuntimeSession;
  readonly spreadsheetStore?: InMemorySpreadsheetStore;
  readonly spreadsheetUrlCapability?: SpreadsheetUrlCapability;
}

interface LocalRuntimeDependencies {
  readonly createExecutor?: typeof createNodeAppsScriptExecutor;
}

export async function createLocalRuntime(
  project: LocalRuntimeProject,
  snapshot: RuntimeDataSnapshot,
  getProgram: () => Program,
  options: LocalRuntimeOptions = {},
  dependencies: LocalRuntimeDependencies = {},
): Promise<LocalRuntime> {
  const scope = createInvocationScope(project);
  const propertiesStore = options.propertiesStore ?? new InMemoryPropertiesStore();

  if (options.propertiesStore === undefined && snapshot.properties !== undefined) {
    await applyPropertiesRuntimeData(propertiesStore, scope, snapshot.properties.value);
  }

  const spreadsheetStore =
    options.spreadsheetStore ??
    new InMemorySpreadsheetStore(snapshot.spreadsheets.map(({ value }) => value));
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
