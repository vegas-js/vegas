import { Plugin } from "vite";

export function exportBridge(): Plugin {
  return {
    name: "vite-plugin-exportbridge",

    applyToEnvironment(environment) {
      return environment.name.startsWith("server");
    },

    generateBundle(outputOptions, bundle, _isWrite) {
      Object.keys(bundle).forEach((key) => {
        const output = bundle[key];
        if (output && output.type === "chunk" && output.isEntry) {
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
    },
  };
}
