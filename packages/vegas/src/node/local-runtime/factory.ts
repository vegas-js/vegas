import type { Program } from "../runtime";
import type { RuntimeDataSnapshot } from "../runtime-data";
import { createNodeAppsScriptExecutor } from "../runtime/node";
import type { SpreadsheetUrlCapability } from "../runtime/spreadsheet/url-capability";
import { createInvocationEnvironment } from "./environment";
import type { LocalRuntimeProject } from "./project";
import type { LocalRuntime } from "./runtime";
import { createInvocationScope } from "./scope";
import type { LocalRuntimeSession } from "./session";
import { resetLocalRuntimeSession } from "./session-reset";

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
  const runtimeSession = options.session ?? (await resetLocalRuntimeSession(scope, snapshot));
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
