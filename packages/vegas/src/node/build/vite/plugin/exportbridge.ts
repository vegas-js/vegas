import path from "node:path";
import vm from "node:vm";

import { parseSync, type Plugin } from "vite";

const INTERNAL_RPC_DISPATCH = "__vegasInternalRpcDispatch";

function hasRpcExport(source: string, filePath: string): boolean {
  const { program } = parseSync(filePath, source);
  return program.body.some((node) => {
    // A star re-export can supply `rpc` from another module.
    // Only generate the GAS global dispatcher when the final chunk exports it.
    if (node.type === "ExportAllDeclaration") {
      return true;
    }

    if (node.type !== "ExportNamedDeclaration") {
      return false;
    }

    const declaration = node.declaration;
    return (
      (declaration?.type === "VariableDeclaration" &&
        declaration.declarations.some(
          (variable) =>
            (variable.id.type === "Identifier" && variable.id.name === "rpc") ||
            (variable.id.type === "ObjectPattern" &&
              variable.id.properties.some(
                (property) =>
                  property.type === "Property" &&
                  property.value.type === "Identifier" &&
                  property.value.name === "rpc",
              )),
        )) ||
      node.specifiers.some(
        (specifier) =>
          specifier.exported.type === "Identifier" && specifier.exported.name === "rpc",
      )
    );
  });
}

function hasExplicitInternalExport(source: string, filePath: string): boolean {
  const { program } = parseSync(filePath, source);
  return program.body.some((node) => {
    if (node.type !== "ExportNamedDeclaration") {
      return false;
    }

    if (
      node.specifiers.some(
        (specifier) =>
          specifier.exported.type === "Identifier" &&
          specifier.exported.name === INTERNAL_RPC_DISPATCH,
      )
    ) {
      return true;
    }

    const declaration = node.declaration;
    if (declaration?.type === "VariableDeclaration") {
      return declaration.declarations.some(
        (variable) =>
          (variable.id.type === "Identifier" && variable.id.name === INTERNAL_RPC_DISPATCH) ||
          (variable.id.type === "ObjectPattern" &&
            variable.id.properties.some(
              (property) =>
                property.type === "Property" &&
                property.value.type === "Identifier" &&
                property.value.name === INTERNAL_RPC_DISPATCH,
            )),
      );
    }

    return (
      (declaration?.type === "FunctionDeclaration" || declaration?.type === "ClassDeclaration") &&
      declaration.id?.name === INTERNAL_RPC_DISPATCH
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

/** The entry selector is supplied by detectServerEntry for real project builds. */
export function exportBridge(isServerEntry: (id: string) => boolean = () => true): Plugin {
  return {
    name: "vite-plugin-exportbridge",

    applyToEnvironment(environment) {
      return environment.name === "server";
    },

    transform(source, id) {
      const sourcePath = id.replace(/[?#].*$/, "");
      const fileName = path.basename(sourcePath);
      if (
        !isServerEntry(sourcePath) ||
        (fileName !== "Code.ts" && fileName !== "Code.js") ||
        !hasRpcExport(source, id)
      ) {
        return;
      }

      if (hasExplicitInternalExport(source, id)) {
        throw new Error(`Server export "${INTERNAL_RPC_DISPATCH}" is reserved for Vegas RPC.`);
      }

      // Resolve the private build entry, not the public server API.
      // Let Vite bundle the internal dispatcher and its shared validator into
      // the GAS IIFE. Never serialize executable functions with toString().
      return `${source}\nexport { ${INTERNAL_RPC_DISPATCH} } from "@vegasjs/vegas/__internal/rpc";\n`;
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
