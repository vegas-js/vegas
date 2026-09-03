import type { RuntimeGlobalEnvironment } from "../environment";
import type { RequestLegacySync } from "../legacy/transport";
import type { RuntimeLogSink } from "../logging";
import { createRuntimeObjectFactories } from "../objects/factories";
import type { ServiceCaller } from "../protocol";
import { createRuntimeServicePorts } from "../servicePorts";
import { invokeScriptFunction } from "./invocation";
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
    invoke(functionName, args) {
      return invokeScriptFunction(scriptContext, functionName, args);
    },
  };
}
