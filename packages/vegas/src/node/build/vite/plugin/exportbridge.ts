import vm from "node:vm";

import type { Plugin } from "vite";

import { assertRpcTransportValue } from "../../../../apps-script/rpc-transport-value";

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
            // The registry is an object, not a callable top-level GAS function.
            if (exportName === "rpc") {
              return;
            }

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
              '  const descriptor = typeof name === "string" && handlers !== null &&',
              '    typeof handlers === "object"',
              "    ? Object.getOwnPropertyDescriptor(handlers, name) : undefined;",
              '  if (typeof name !== "string" || name.endsWith("_") || name === "then" ||',
              '      !descriptor || !("value" in descriptor) ||',
              '      typeof descriptor.value !== "function") {',
              '    throw new Error("Unknown or private RPC handler: " + String(name));',
              "  }",
              // Embed the same self-contained validation function used by the client.
              // Its compiled representation has no imports or free variables, so
              // the GAS server IIFE remains independent of a module loader.
              `  const assertRpcTransportValue = (${assertRpcTransportValue.toString()});`,
              "  for (let index = 0; index < args.length; index++) {",
              '    assertRpcTransportValue(args[index], "arguments[" + index + "]");',
              "  }",
              "  const result = descriptor.value(...args);",
              '  assertRpcTransportValue(result, "return", true);',
              "  return result;",
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
