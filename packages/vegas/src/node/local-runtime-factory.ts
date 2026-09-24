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
  readonly session?: LocalRuntimeSession;
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
  let runtimeSession = options.session;

  if (runtimeSession === undefined) {
    const propertiesStore = new InMemoryPropertiesStore();

    if (snapshot.properties !== undefined) {
      await applyPropertiesRuntimeData(propertiesStore, scope, snapshot.properties.value);
    }

    runtimeSession = new LocalRuntimeSession({
      stores: {
        propertiesStore,
        spreadsheetStore: new InMemorySpreadsheetStore(
          snapshot.spreadsheets.map(({ value }) => value),
        ),
      },
    });
  }

  const createExecutor = dependencies.createExecutor ?? createNodeAppsScriptExecutor;
  const executor = createExecutor({
    ...runtimeSession.stores,
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
      spreadsheets: runtimeSession.stores.spreadsheetStore,
    },
  };
}
