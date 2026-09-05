import { types as utilTypes } from "node:util";
import type vm from "node:vm";

import { projectScriptArguments } from "./argumentProjection";
import { resolveScriptFunction } from "./entryResolution";

export interface InvocationCompletion {
  readonly value: unknown;
}

export type MaterializeScriptArguments = (
  context: vm.Context,
  args: readonly unknown[],
) => readonly unknown[];

export interface InvokeScriptFunctionOptions {
  readonly materializeArguments?: MaterializeScriptArguments;
}

export async function invokeScriptFunction(
  context: vm.Context,
  functionName: string,
  args: readonly unknown[],
  options: InvokeScriptFunctionOptions = {},
): Promise<InvocationCompletion> {
  const targetFn = resolveScriptFunction(context, functionName);

  const materializeArguments = options.materializeArguments ?? projectScriptArguments;

  const scriptArguments = materializeArguments(context, args);

  return invokeFunction(targetFn, ...scriptArguments);
}

export async function invokeFunction(
  fn: CallableFunction,
  ...args: readonly unknown[]
): Promise<InvocationCompletion> {
  const value = Reflect.apply(fn, undefined, args);

  if (utilTypes.isPromise(value)) {
    return {
      value: await value,
    };
  }

  return {
    value,
  };
}
