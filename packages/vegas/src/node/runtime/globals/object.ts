import vm from "node:vm";

export type CreateGasObject = () => Record<string, unknown>;
export type CreateGasArray = <T>() => T[];

export function createVmGasObjectFactory(context: vm.Context): CreateGasObject {
  const script = new vm.Script("({})");

  return () => script.runInContext(context) as Record<string, unknown>;
}

export function createVmGasArrayFactory(context: vm.Context): CreateGasArray {
  const script = new vm.Script("[]");

  return <T>() => script.runInContext(context) as T[];
}
