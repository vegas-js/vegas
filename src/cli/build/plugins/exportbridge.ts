import { parse } from "node:path";
import { Plugin } from "vite";

import { excludesGASUserFunctionNames } from "../../../shared/gas";

export function exportBridge(serverEntry: string): Plugin {
  return {
    name: "vite-plugin-exportbridge",

    generateBundle(_outputOptions, bundle, _isWrite) {
      const key = `${parse(serverEntry).name}.js`;
      const entry = bundle[key];
      if (entry && entry.type === "chunk") {
        entry.code += "\n/* Function bridge for GAS Client */";
        entry.exports.forEach((expo) => {
          if (!(excludesGASUserFunctionNames as readonly string[]).includes(expo)) {
            entry.code += `\nfunction ${expo}(...args) { return globalThis.${expo}(args); };`;
          }
        });
        entry.code += "\n";
      }
    },
  };
}
