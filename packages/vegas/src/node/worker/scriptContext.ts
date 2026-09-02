import vm from "node:vm";

import {
  composeGasGlobals,
  createLegacyUnsupportedGlobalSeed,
  type GasGlobalComposerDependencies,
} from "./global/composer";

export type ScriptContextDependencies = GasGlobalComposerDependencies;

export function createScriptContext(dependencies: ScriptContextDependencies): vm.Context {
  const context = vm.createContext(createLegacyUnsupportedGlobalSeed());

  composeGasGlobals(context, dependencies);

  return context;
}
