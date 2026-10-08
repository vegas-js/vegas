import vm from "node:vm";

import type { Plugin } from "vite";

function requireBridgeExportName(name: string): string {
  try {
    new vm.Script(`function ${name}() {}`);
  } catch {
    throw new Error(`Server export "${name}" cannot be exposed as an Apps Script function.`);
  }

  return name;
}

export function exportBridge(): Plugin {
  return {
    name: "vite-plugin-exportbridge",

    applyToEnvironment(environment) {
      return environment.name === "server";
    },

    generateBundle(outputOptions, bundle) {
      Object.values(bundle).forEach((output) => {
        if (output.type === "chunk" && output.isEntry) {
          const bridgeCodes: string[] = ["\n/* Function bridge for GAS Client */"];
          output.exports.forEach((exportName) => {
            const functionName = requireBridgeExportName(exportName);

            bridgeCodes.push(
              `function ${functionName}(...args) { return ${outputOptions.name ?? "globalThis"}.${functionName}(...args); };`,
            );
          });
          if (output.exports.includes("rpc")) {
            if (output.exports.includes("vegasRpcCall")) {
              throw new Error('Server export "vegasRpcCall" conflicts with the RPC dispatcher.');
            }

            // GAS requires a statically declared global function. A single dispatcher
            // lets registered handlers be defined without generating one wrapper per RPC.
            const root = outputOptions.name ?? "globalThis";
            bridgeCodes.push(
              "function vegasRpcCall(name, ...args) {",
              `  const handlers = ${root}.rpc;`,
              '  if (typeof name !== "string" || name.endsWith("_") ||',
              '      handlers === null || typeof handlers !== "object" ||',
              "      !Object.prototype.hasOwnProperty.call(handlers, name) ||",
              '      typeof handlers[name] !== "function") {',
              '    throw new Error("Unknown or private RPC handler: " + String(name));',
              "  }",
              "  return handlers[name](...args);",
              "}",
            );
          }

          if (bridgeCodes.length > 1) {
            output.code += bridgeCodes.join("\n");
          }
        }
      });
    },
  };
}
