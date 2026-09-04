import type { RuntimeGlobalEnvironment } from "../environment";
import type { RequestLegacySync } from "../legacy/transport";
import type { RuntimeLogSink } from "../logging";
import { createRuntimeObjectFactories } from "../objects/factories";
import type { ServiceCaller } from "../protocol";
import { createRuntimeServicePorts } from "../servicePorts";
import { createHtmlOutputFacadeFactory } from "../services/html/htmlOutputFacade";
import { invokeScriptFunction } from "./invocation";
import { projectLegacyWebAppResult } from "./legacyWebAppResultProjection";
import { createScriptContext } from "./scriptContext";
import { evaluateScript, evaluateScriptWithBindings } from "./scriptRuntime";
import type { EvaluateHtmlTemplate } from "./types";

export interface ScriptRuntimeDependencies {
  code: string;
  environment: RuntimeGlobalEnvironment;
  requestLegacySync: RequestLegacySync;
  logSink: RuntimeLogSink;
  callService: ServiceCaller;
}

export interface ScriptRuntime {
  invoke(functionName: string, args: unknown[]): Promise<unknown>;
}

export function createScriptRuntime(dependencies: ScriptRuntimeDependencies): ScriptRuntime {
  const { code, environment, requestLegacySync, logSink, callService } = dependencies;

  const htmlOutputFacadeFactory = createHtmlOutputFacadeFactory();

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

  let templateContext: ReturnType<typeof createScriptContext> | undefined;

  const evaluateHtmlTemplate: EvaluateHtmlTemplate = (templateCode, bindings) => {
    if (!templateContext) {
      throw new Error("Script context is not initialized");
    }

    return evaluateScriptWithBindings(templateCode, templateContext, bindings);
  };

  const factories = createRuntimeObjectFactories({
    requestLegacySync,
    rangeService,
    sheetService,
    evaluateHtmlTemplate,
  });

  const scriptContext = createScriptContext({
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

  templateContext = scriptContext;

  evaluateScript(code, scriptContext);

  return {
    async invoke(functionName, args) {
      const result = await invokeScriptFunction(scriptContext, functionName, args);

      return projectLegacyWebAppResult(functionName, result, {
        getHtmlOutputXFrameOptionsMode: (htmlOutputFacadeFactory as any).resolveXFrameOptionsMode,
      });
    },
  };
}
