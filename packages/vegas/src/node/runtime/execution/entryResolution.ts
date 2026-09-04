import vm from "node:vm";

const SCRIPT_IDENTIFIER_PATTERN = /^[$_\p{ID_Start}](?:[$_\p{ID_Continue}]|\u200C|\u200D)*$/u;

export class ScriptFunctionNotFoundError extends Error {
  readonly functionName: string;

  constructor(functionName: string) {
    super(`Script function not found: ${functionName}`);

    this.name = "ScriptFunctionNotFoundError";
    this.functionName = functionName;
  }
}

export function resolveScriptFunction(context: vm.Context, functionName: string): CallableFunction {
  if (!SCRIPT_IDENTIFIER_PATTERN.test(functionName)) {
    throw new ScriptFunctionNotFoundError(functionName);
  }

  let script: vm.Script;

  try {
    script = new vm.Script(functionName, {
      filename: "vegas:entry-resolution",
    });
  } catch (error) {
    if (isNamedError(error, "SyntaxError")) {
      throw new ScriptFunctionNotFoundError(functionName);
    }

    throw error;
  }

  let value: unknown;

  try {
    value = script.runInContext(context);
  } catch (error) {
    if (isMissingBindingReferenceError(error, functionName)) {
      throw new ScriptFunctionNotFoundError(functionName);
    }

    throw error;
  }

  if (typeof value !== "function") {
    throw new ScriptFunctionNotFoundError(functionName);
  }

  return value;
}

function isMissingBindingReferenceError(error: unknown, functionName: string): boolean {
  if (!isNamedError(error, "ReferenceError")) {
    return false;
  }

  return (
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message === `${functionName} is not defined`
  );
}

function isNamedError(error: unknown, name: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === name
  );
}
