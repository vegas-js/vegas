import { Plugin } from "vite";

type GenerateBundleObjectHook = Pick<Plugin, "generateBundle">;
type GenerateBundleObjectHookFunction = GenerateBundleObjectHook[keyof GenerateBundleObjectHook];
type ReplaceReturnType<F extends (...args: any[]) => any, R> = F extends (...args: infer P) => any
  ? (...args: P) => R
  : never;
type GenerateBundleFunction = ReplaceReturnType<
  Extract<GenerateBundleObjectHookFunction, Function>,
  void
>;
type GenerateBundleFunctionArgs = Parameters<GenerateBundleFunction>;
type AppendGasExportBridgeFunctionArgs = [
  GenerateBundleFunctionArgs[0],
  GenerateBundleFunctionArgs[1],
  GenerateBundleFunctionArgs[2]?,
];
type AppendGasExportBridgeFunction = (
  ...args: AppendGasExportBridgeFunctionArgs
) => ReturnType<GenerateBundleFunction>;

export const appendGasExportBridge: AppendGasExportBridgeFunction = (outputOptions, bundle) => {
  Object.values(bundle).forEach((output) => {
    if (output.type === "chunk" && output.isEntry) {
      const bridgeCodes: string[] = ["\n/* Function bridge for GAS Client */"];
      output.exports.forEach((expo) => {
        bridgeCodes.push(
          `function ${expo}(...args) { return ${outputOptions.name ?? "globalThis"}.${expo}(...args); };`,
        );
      });
      if (bridgeCodes.length > 1) {
        output.code += bridgeCodes.join("\n");
      }
    }
  });
};

export function exportBridge(): Plugin {
  return {
    name: "vite-plugin-exportbridge",

    applyToEnvironment(environment) {
      return environment.name === "server";
    },

    generateBundle(outputOptions, bundle) {
      appendGasExportBridge(outputOptions, bundle);
    },
  };
}
