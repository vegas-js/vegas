import vm from "node:vm";

export type CreateGasObject = () => Record<string, unknown>;

export function createVmGasObjectFactory(context: vm.Context): CreateGasObject {
  const script = new vm.Script("({})");

  return () => script.runInContext(context) as Record<string, unknown>;
}
