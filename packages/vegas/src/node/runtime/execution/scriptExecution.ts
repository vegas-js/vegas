import type vm from "node:vm";

import {
  invokeScriptFunction,
  type InvocationCompletion,
  type MaterializeScriptArguments,
} from "./invocation";
import { evaluateScript, evaluateScriptWithBindings } from "./scriptRuntime";
import type { EvaluateHtmlTemplate } from "./types";

export type CreateScriptExecutionContext = (
  evaluateHtmlTemplate: EvaluateHtmlTemplate,
) => vm.Context;

export interface ExecuteScriptInvocationOptions {
  readonly code: string;
  readonly functionName: string;
  readonly args: readonly unknown[];
  readonly createContext: CreateScriptExecutionContext;
  readonly materializeArguments?: MaterializeScriptArguments;
}

export async function executeScriptInvocation(
  options: ExecuteScriptInvocationOptions,
): Promise<InvocationCompletion> {
  const { code, functionName, args, createContext, materializeArguments } = options;

  let context: vm.Context | undefined;

  const evaluateHtmlTemplate: EvaluateHtmlTemplate = (templateCode, bindings) => {
    if (!context) {
      throw new Error("Script context is not initialized");
    }

    return evaluateScriptWithBindings(templateCode, context, bindings);
  };

  context = createContext(evaluateHtmlTemplate);

  evaluateScript(code, context);

  return invokeScriptFunction(context, functionName, args, {
    materializeArguments,
  });
}
