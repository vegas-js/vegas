import path from "node:path";
import vm from "node:vm";

import { parseSync, type Plugin } from "vite";

const INTERNAL_RPC_DISPATCH = "__vegasInternalRpcDispatch";

function hasRpcExport(source: string, filePath: string): boolean {
  const { program } = parseSync(filePath, source);
  return program.body.some((node) => {
    if (node.type !== "ExportNamedDeclaration") {
      return false;
    }

    const declaration = node.declaration;
    return (
      (declaration?.type === "VariableDeclaration" &&
        declaration.declarations.some(
          (variable) => variable.id.type === "Identifier" && variable.id.name === "rpc",
        )) ||
      node.specifiers.some(
        (specifier) =>
          specifier.exported.type === "Identifier" && specifier.exported.name === "rpc",
      )
    );
  });
}

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

    transform(source, id) {
      const fileName = path.basename(id.replace(/[?#].*$/, ""));
      if ((fileName !== "Code.ts" && fileName !== "Code.js") || !hasRpcExport(source, id)) {
        return;
      }

      // Let Vite bundle the internal dispatcher and its shared validator into
      // the GAS IIFE. Never serialize executable functions with toString().
      return `${source}\nexport { ${INTERNAL_RPC_DISPATCH} } from "@vegasjs/vegas/server";\n`;
    },

    generateBundle(outputOptions, bundle) {
      Object.values(bundle).forEach((output) => {
        if (output.type === "chunk" && output.isEntry) {
          const bridgeCodes: string[] = ["\n/* Function bridge for GAS Client */"];
          output.exports.forEach((exportName) => {
            // The registry is an object, not a callable top-level GAS function.
            if (exportName === "rpc" || exportName === INTERNAL_RPC_DISPATCH) {
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

            if (!output.exports.includes(INTERNAL_RPC_DISPATCH)) {
              throw new Error("Registered RPC entry must export rpc from Code.ts or Code.js.");
            }

            // Only the public dispatcher becomes a GAS global. Its implementation
            // and validator are ordinary dependencies bundled inside GASApp.
            const root = outputOptions.name ?? "globalThis";
            bridgeCodes.push(
              "function vegasRpcCall(name, ...args) {",
              `  return ${root}.${INTERNAL_RPC_DISPATCH}(${root}.rpc, name, ...args);`,
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
