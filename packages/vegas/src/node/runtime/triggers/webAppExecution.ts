import type { ScriptRuntime, ScriptRuntimeExecution } from "../execution/bootstrap";
import { createWebAppTriggerInvocation, type WebAppTriggerRequest } from "./webApp";

export async function executeWebAppTrigger(
  runtime: ScriptRuntime,
  request: WebAppTriggerRequest,
): Promise<ScriptRuntimeExecution> {
  const invocation = createWebAppTriggerInvocation(request);

  return runtime.execute(invocation.functionName, invocation.args, {
    materializeArguments: invocation.materializeArguments,
  });
}
