import vm from "node:vm";

export function evaluateScript(code: string, context: vm.Context): void {
  const script = new vm.Script(code);
  script.runInContext(context);
}

export function evaluateScriptWithBindings<T>(
  code: string,
  baseContext: vm.Context,
  bindings: Record<string, unknown>,
): T {
  const context = vm.createContext({
    ...baseContext,
    ...bindings,
  });
  const script = new vm.Script(code);

  return script.runInContext(context) as T;
}
