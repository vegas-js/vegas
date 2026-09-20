import vm, { type Context } from "node:vm";
import type { MessagePort } from "node:worker_threads";

import {
  createRuntimeGlobals,
  type InvocationContext,
  type InvocationEnvironment,
  type Program,
} from "../runtime";
import { createBlobConverter } from "../runtime/blob-converter";
import type { HtmlTemplateEvaluator } from "../runtime/html-template";
import { HTML_TEMPLATE_OUTPUT_FACTORY } from "../runtime/html-template-compiler";
import { createHtmlTemplateOutput } from "../runtime/html-template-output";
import { createNodeUtilities, createWorkerHostBridge } from "../runtime/node";

export interface RuntimeWorkerData {
  readonly program: Program;
  readonly environment: InvocationEnvironment;
  readonly context?: InvocationContext;
  readonly port: MessagePort;
  readonly sharedArray: Int32Array;
}

export function createWorkerRuntimeContext(data: RuntimeWorkerData): Context {
  const hostBridge = createWorkerHostBridge(data.port, data.sharedArray);
  const blobConverter = createBlobConverter(hostBridge);
  let context: Context;

  // Apps Script documents that HtmlTemplate.evaluate() makes template properties available in
  // scope, but does not define how those bindings are installed. Vegas evaluates generated code
  // in the existing Apps Script VM and adds only the explicit template properties to its scope.
  // Binding collisions and other undocumented behavior remain intentionally unspecified.
  const evaluateHtmlTemplate: HtmlTemplateEvaluator = (code, bindings) => {
    const scopedBindings = {
      ...bindings,
      [Symbol.unscopables]: {
        [HTML_TEMPLATE_OUTPUT_FACTORY]: true,
      },
    };
    const evaluate = new vm.Script(
      `(function(__vegasHtmlTemplateBindings) {
        with (__vegasHtmlTemplateBindings) {
          return ${code};
        }
      })`,
    ).runInContext(context) as (
      bindings: Readonly<Record<string, unknown>>,
    ) => ReturnType<HtmlTemplateEvaluator>;

    return evaluate(scopedBindings);
  };

  const globals = createRuntimeGlobals({
    hostBridge,
    context: data.context,
    environment: data.environment,
    htmlFiles: data.program.htmlFiles,
    htmlTemplateEvaluator: evaluateHtmlTemplate,
    loggingTarget: console,
    utilities: createNodeUtilities(),
  });

  Object.defineProperty(globals, HTML_TEMPLATE_OUTPUT_FACTORY, {
    enumerable: false,
    value: () =>
      createHtmlTemplateOutput(data.context?.webApp === true, evaluateHtmlTemplate, blobConverter),
  });

  context = vm.createContext(globals);

  new vm.Script(data.program.source).runInContext(context);

  return context;
}
