import path from "node:path";

import { Plugin } from "vite";

export function exportBridge(serverEntry: string): Plugin {
  return {
    name: "vite-plugin-exportbridge",

    applyToEnvironment(environment) {
      return !environment.name.startsWith("web");
    },

    generateBundle(outputOptions, bundle, _isWrite) {
      const key = `${path.parse(serverEntry).name}.js`;
      const entry = bundle[key];
      if (entry && entry.type === "chunk") {
        const bridgeCodes: string[] = ["\n/* Function bridge for GAS Client */"];
        entry.exports.forEach((expo) => {
          bridgeCodes.push(
            `function ${expo}(...args) { return ${outputOptions.name ?? "globalThis"}.${expo}(...args); };`,
          );
        });
        if (bridgeCodes.length > 1) {
          entry.code += bridgeCodes.join("\n");
        }
      }
    },
  };
}
