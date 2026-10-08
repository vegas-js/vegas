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
              // This is a Vegas-specific, intentionally conservative runtime guard.
              // It rejects values the declared RPC contract cannot safely describe;
              // it does not emulate google.script.run serialization or copy inputs.
              "  function assertTransportValue(value, path, active) {",
              '    if (value === null || typeof value === "string" ||',
              '        typeof value === "boolean" || typeof value === "number") return;',
              '    if (value === undefined && path === "return") return;',
              '    if (typeof value !== "object") {',
              '      throw new TypeError("Unsupported RPC transport value at " + path);',
              "    }",
              "    if (!Array.isArray(value) &&",
              '        Object.prototype.toString.call(value) !== "[object Object]") {',
              '      throw new TypeError("Unsupported RPC transport value at " + path);',
              "    }",
              "    if (active.has(value)) {",
              '      throw new TypeError("Cyclic RPC transport value at " + path);',
              "    }",
              "    active.add(value);",
              "    try {",
              "      for (const key of Reflect.ownKeys(value)) {",
              '        if (typeof key !== "string") {',
              '          throw new TypeError("Unsupported RPC transport value at " + path);',
              "        }",
              "        const property = Object.getOwnPropertyDescriptor(value, key);",
              '        if (!property || !("value" in property)) {',
              '          throw new TypeError("Unsupported RPC transport value at " + path);',
              "        }",
              '        assertTransportValue(property.value, path + "[" + JSON.stringify(key) + "]", active);',
              "      }",
              "    } finally {",
              "      active.delete(value);",
              "    }",
              "  }",
              "  for (let index = 0; index < args.length; index++) {",
              '    assertTransportValue(args[index], "arguments[" + index + "]", new WeakSet());',
              "  }",
              "  const result = descriptor.value(...args);",
              '  assertTransportValue(result, "return", new WeakSet());',
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
