import path from "node:path";
import vm from "node:vm";

import { parseSync, type Plugin } from "vite";

const INTERNAL_RPC_DISPATCH = "__vegasInternalRpcDispatch";
// A separate export name keeps user-defined reserved exports visible when they
// arrive through `export *`, so the final bundle can reject collisions.
const INJECTED_RPC_DISPATCH = "__vegasInjectedRpcDispatch";

function matchesExportName(
  exported: { readonly type: string; readonly name?: string; readonly value?: unknown },
  name: string,
): boolean {
  return (
    (exported.type === "Identifier" && exported.name === name) ||
    (exported.type === "Literal" && exported.value === name)
  );
}

function hasRpcExport(source: string, filePath: string): boolean {
  const { program } = parseSync(filePath, source);
  return program.body.some((node) => {
    // A bare star re-export can supply `rpc` from another module.
    // A namespace re-export only supplies its declared export name.
    if (node.type === "ExportAllDeclaration") {
      return (
        node.exportKind !== "type" &&
        (node.exported == null || matchesExportName(node.exported, "rpc"))
      );
    }

    if (node.type !== "ExportNamedDeclaration" || node.exportKind === "type") {
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
          specifier.exportKind !== "type" && matchesExportName(specifier.exported, "rpc"),
      )
    );
  });
}

/**
 * `export * as rpc` creates a module namespace, whose functions may be
 * exposed by getters. Snapshot its exports into own data properties rather
 * than weakening the registered RPC dispatcher's accessor validation.
 */
function normalizeRpcNamespaceExports(source: string, filePath: string): string {
  const { program } = parseSync(filePath, source);
  let normalized = source;

  // Replace backwards so original AST offsets remain valid.
  for (let index = program.body.length - 1; index >= 0; index--) {
    const node = program.body[index];
    if (node?.type !== "ExportAllDeclaration" || node.exportKind === "type" || !node.exported) {
      continue;
    }

    const exportedName =
      node.exported.type === "Identifier" ? node.exported.name : node.exported.value;
    if (exportedName !== "rpc") {
      continue;
    }

    let binding = `__vegasRpcNamespace${index}`;
    while (source.includes(binding)) {
      binding += "_";
    }
    const specifier = source.slice(node.source.start, node.source.end);
    const replacement = [
      `import * as ${binding} from ${specifier};`,
      `export const rpc = { ...${binding} };`,
    ].join("\n");
    normalized = normalized.slice(0, node.start) + replacement + normalized.slice(node.end);
  }

  return normalized;
}

function hasExplicitInternalExport(source: string, filePath: string): boolean {
  const { program } = parseSync(filePath, source);
  return program.body.some((node) => {
    if (node.type === "ExportAllDeclaration") {
      return (
        node.exportKind !== "type" &&
        node.exported != null &&
        matchesExportName(node.exported, INTERNAL_RPC_DISPATCH)
      );
    }

    if (node.type !== "ExportNamedDeclaration" || node.exportKind === "type") {
      return false;
    }

    if (
      node.specifiers.some(
        (specifier) =>
          specifier.exportKind !== "type" &&
          matchesExportName(specifier.exported, INTERNAL_RPC_DISPATCH),
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
      const normalizedSource = normalizeRpcNamespaceExports(source, id);
      return `${normalizedSource}\nexport { ${INTERNAL_RPC_DISPATCH} as ${INJECTED_RPC_DISPATCH} } from "@vegasjs/vegas/__internal/rpc";\n`;
    },

    generateBundle(outputOptions, bundle) {
      Object.values(bundle).forEach((output) => {
        if (output.type === "chunk" && output.isEntry) {
          const bridgeCodes: string[] = ["\n/* Function bridge for GAS Client */"];
          output.exports.forEach((exportName) => {
            // The registry is an object, not a callable top-level GAS function.
            if (
              exportName === "rpc" ||
              exportName === INTERNAL_RPC_DISPATCH ||
              exportName === INJECTED_RPC_DISPATCH
            ) {
              return;
            }

            const functionName = requireBridgeExportName(exportName);

            bridgeCodes.push(
              `function ${functionName}(...args) { return ${outputOptions.name ?? "globalThis"}.${functionName}(...args); };`,
            );
          });
          if (output.exports.includes("rpc")) {
            if (output.exports.includes(INTERNAL_RPC_DISPATCH)) {
              throw new Error(
                `Server export "${INTERNAL_RPC_DISPATCH}" is reserved for Vegas RPC.`,
              );
            }

            if (output.exports.includes("vegasRpcCall")) {
              throw new Error('Server export "vegasRpcCall" conflicts with the RPC dispatcher.');
            }

            if (!output.exports.includes(INJECTED_RPC_DISPATCH)) {
              throw new Error("Registered RPC entry must export rpc from Code.ts or Code.js.");
            }

            // Only the public dispatcher becomes a GAS global. Its implementation
            // and validator are ordinary dependencies bundled inside GASApp.
            const root = outputOptions.name ?? "globalThis";
            bridgeCodes.push(
              "function vegasRpcCall(name, ...args) {",
              `  return ${root}.${INJECTED_RPC_DISPATCH}(${root}.rpc, name, ...args);`,
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
