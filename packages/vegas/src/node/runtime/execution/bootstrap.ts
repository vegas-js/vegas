import type { RuntimeGlobalEnvironment } from "../environment";
import type { RequestLegacySync } from "../legacy/transport";
import type { RuntimeLogSink } from "../logging";
import { createRuntimeObjectFactories } from "../objects/factories";
import type { ServiceCaller } from "../protocol";
import { createRuntimeServicePorts } from "../servicePorts";
import { createHtmlOutputFacadeFactory } from "../services/html/htmlOutputFacade";
import { invokeScriptFunction } from "./invocation";
import { projectLegacyWebAppResult } from "./legacyWebAppResultProjection";
import { projectScriptResult } from "./resultProjection";
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

  return {
    async invoke(functionName, args) {
      const htmlOutputFacadeFactory = createHtmlOutputFacadeFactory();

      let scriptContext: ReturnType<typeof createScriptContext> | undefined;

      const evaluateHtmlTemplate: EvaluateHtmlTemplate = (templateCode, bindings) => {
        if (!scriptContext) {
          throw new Error("Script context is not initialized");
        }

        return evaluateScriptWithBindings(templateCode, scriptContext, bindings);
      };

      const factories = createRuntimeObjectFactories({
        requestLegacySync,
        rangeService,
        sheetService,
        evaluateHtmlTemplate,
      });

      scriptContext = createScriptContext({
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

      evaluateScript(code, scriptContext);

      const { value: result } = await invokeScriptFunction(scriptContext, functionName, args);

      const legacyProjectedResult = projectLegacyWebAppResult(functionName, result, {
        // oxlint-disable-next-line unbound-method
        getHtmlOutputXFrameOptionsMode: htmlOutputFacadeFactory.resolveXFrameOptionsMode,
      });

      return projectScriptResult(legacyProjectedResult);
    },
  };
}
