import vm from "node:vm";

export function evaluateScript(code: string, context: vm.Context): void {
  const script = new vm.Script(code);
  script.runInContext(context);
}
