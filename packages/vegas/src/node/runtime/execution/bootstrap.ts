import type { RuntimeGlobalEnvironment } from "../environment";
import type { RequestLegacySync } from "../legacy/transport";
import type { RuntimeLogSink } from "../logging";
import { createRuntimeObjectFactories } from "../objects/factories";
import type { ServiceCaller } from "../protocol";
import { createRuntimeServicePorts } from "../servicePorts";
import { createHtmlOutputFacadeFactory } from "../services/html/htmlOutputFacade";
import { projectScriptResult } from "./resultProjection";
import { createScriptContext } from "./scriptContext";
import { executeScriptInvocation } from "./scriptExecution";

export interface ScriptRuntimeDependencies {
  code: string;
  environment: RuntimeGlobalEnvironment;
  requestLegacySync: RequestLegacySync;
  logSink: RuntimeLogSink;
  callService: ServiceCaller;
}

export interface ScriptRuntimeExecution {
  readonly value: unknown;
  getHtmlOutputXFrameOptionsMode(value: unknown): string | null | undefined;
}

export interface ScriptRuntime {
  execute(functionName: string, args: readonly unknown[]): Promise<ScriptRuntimeExecution>;
  invoke(functionName: string, args: readonly unknown[]): Promise<unknown>;
}

export function createScriptRuntime(dependencies: ScriptRuntimeDependencies): ScriptRuntime {
  const { code, environment, requestLegacySync, logSink, callService } = dependencies;

  const {
    spreadsheetAppService,
    sheetService,
    rangeService,
    urlFetchService,
    htmlService,
    sessionService,
    cacheService,
    propertiesService,
  } = createRuntimeServicePorts(callService);

  const execute = async (
    functionName: string,
    args: readonly unknown[],
  ): Promise<ScriptRuntimeExecution> => {
    const htmlOutputFacadeFactory = createHtmlOutputFacadeFactory();

    const invocation = await executeScriptInvocation({
      code,
      functionName,
      args,

      createContext(evaluateHtmlTemplate) {
        const factories = createRuntimeObjectFactories({
          requestLegacySync,
          rangeService,
          sheetService,
          evaluateHtmlTemplate,
        });

        return createScriptContext({
          environment,
          htmlOutputFacadeFactory,
          requestLegacySync,
          logSink,
          spreadsheetAppService,
          urlFetchService,
          htmlService,
          sessionService,
          cacheService,
          propertiesService,
          ...factories,
        });
      },
    });

    return {
      value: invocation.value,

      getHtmlOutputXFrameOptionsMode(value) {
        return htmlOutputFacadeFactory.resolveXFrameOptionsMode(value);
      },
    };
  };

  return {
    execute,

    async invoke(functionName, args) {
      const execution = await execute(functionName, args);

      return projectScriptResult(execution.value);
    },
  };
}
