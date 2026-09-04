import type vm from "node:vm";

import { resolveScriptFunction } from "./entryResolution";

export async function invokeScriptFunction(
  context: vm.Context,
  functionName: string,
  args: readonly unknown[],
): Promise<unknown> {
  const targetFn = resolveScriptFunction(context, functionName);

  return invokeFunction(targetFn, ...args);
}

export async function invokeFunction(
  fn: CallableFunction,
  ...args: readonly unknown[]
): Promise<unknown> {
  const result = Reflect.apply(fn, undefined, args);

  return await result;
}
