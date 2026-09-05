import type { RuntimeGlobalEnvironment } from "../environment";
import type { RequestLegacySync } from "../legacy/transport";
import type { RuntimeLogSink } from "../logging";
import { createRuntimeObjectFactories } from "../objects/factories";
import type { ServiceCaller } from "../protocol";
import { createRuntimeServicePorts } from "../servicePorts";
import { createTextOutputFacadeFactory } from "../services/content/textOutputFacade";
import { createHtmlOutputFacadeFactory } from "../services/html/htmlOutputFacade";
import type { MaterializeScriptArguments } from "./invocation";
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
  isHtmlOutput(value: unknown): boolean;
  isTextOutput(value: unknown): boolean;
  getHtmlOutputXFrameOptionsMode(value: unknown): string | null | undefined;
}

export interface ScriptRuntimeExecuteOptions {
  readonly materializeArguments?: MaterializeScriptArguments;
}

export interface ScriptRuntime {
  execute(
    functionName: string,
    args: readonly unknown[],
    options?: ScriptRuntimeExecuteOptions,
  ): Promise<ScriptRuntimeExecution>;
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
    options: ScriptRuntimeExecuteOptions = {},
  ): Promise<ScriptRuntimeExecution> => {
    const textOutputFacadeFactory = createTextOutputFacadeFactory();

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
          textOutputFacadeFactory,
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

      ...(options.materializeArguments === undefined
        ? {}
        : {
            materializeArguments: options.materializeArguments,
          }),
    });

    return {
      value: invocation.value,

      isHtmlOutput(value) {
        return htmlOutputFacadeFactory.resolve(value) !== undefined;
      },

      isTextOutput(value) {
        return textOutputFacadeFactory.resolve(value) !== undefined;
      },

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
