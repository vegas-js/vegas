import fs from "node:fs";
import path from "node:path";

import { type Plugin, parseSync, Visitor } from "vite";

import type { BuildPlan } from "../../plan";

export const VIRTUAL_DETECT_SERVER_ENTRY = "virtual:detectserverentry";

interface ClientModuleReference {
  readonly source: string;
  readonly typeOnly: boolean;
}

function normalizeResolvedFileId(id: string): string {
  return path.normalize(id.replace(/[?#].*$/, ""));
}

function isTypeOnlyImport(node: {
  readonly importKind?: string;
  readonly specifiers: readonly {
    readonly type: string;
    readonly importKind?: string;
  }[];
}): boolean {
  if (node.importKind === "type") {
    return true;
  }

  return (
    node.specifiers.length > 0 &&
    node.specifiers.every(
      (specifier) => specifier.type === "ImportSpecifier" && specifier.importKind === "type",
    )
  );
}

function isTypeOnlyNamedExport(node: {
  readonly exportKind?: string;
  readonly specifiers: readonly {
    readonly exportKind?: string;
  }[];
}): boolean {
  if (node.exportKind === "type") {
    return true;
  }

  return (
    node.specifiers.length > 0 &&
    node.specifiers.every((specifier) => specifier.exportKind === "type")
  );
}

function collectClientModuleReferences(filePath: string): ClientModuleReference[] {
  const references: ClientModuleReference[] = [];
  const { program } = parseSync(filePath, fs.readFileSync(filePath, "utf8"));
  const visitor = new Visitor({
    ImportDeclaration(node) {
      references.push({
        source: node.source.value,
        typeOnly: isTypeOnlyImport(node),
      });
    },

    ExportNamedDeclaration(node) {
      if (node.source) {
        references.push({
          source: node.source.value,
          typeOnly: isTypeOnlyNamedExport(node),
        });
      }
    },

    ExportAllDeclaration(node) {
      references.push({
        source: node.source.value,
        typeOnly: node.exportKind === "type",
      });
    },

    ImportExpression(node) {
      if (node.source.type === "Literal" && typeof node.source.value === "string") {
        references.push({
          source: node.source.value,
          typeOnly: false,
        });
      }
    },
  });

  visitor.visit(program);

  return references;
}

export function detectServerEntry(plan: BuildPlan): Plugin {
  const serverSourcesById = new Map(
    plan.serverSources.map((source) => [normalizeResolvedFileId(source), source]),
  );

  return {
    name: "vite-plugin-detect-server-entry",

    applyToEnvironment(environment) {
      return environment.name === "server";
    },

    async resolveId(source, _importer, options) {
      if (source.endsWith(VIRTUAL_DETECT_SERVER_ENTRY)) {
        const serverEntries = new Set<string>();

        for (const clientSourcePath of plan.clientSources) {
          const references = collectClientModuleReferences(clientSourcePath);

          for (const reference of references) {
            const resolvedId = await this.resolve(reference.source, clientSourcePath, options);
            const serverSource =
              resolvedId === null
                ? undefined
                : serverSourcesById.get(normalizeResolvedFileId(resolvedId.id));

            if (!serverSource) {
              continue;
            }

            if (!reference.typeOnly) {
              throw new Error("Server sources may only be referenced from client code as types.");
            }

            if (path.parse(serverSource).base !== "Code.ts") {
              throw new Error("The only file that can be imported from the server side is Code.ts");
            }

            serverEntries.add(serverSource);
          }
        }

        if (serverEntries.size > 1) {
          throw new Error("Duplicate server entry.");
        }

        const serverEntry = serverEntries.values().next().value;

        if (serverEntry) {
          return serverEntry;
        }

        const fallbackEntries = plan.serverSources.filter(
          (source) => path.parse(source).base === "Code.ts",
        );
        if (fallbackEntries.length > 1) {
          throw new Error("Duplicate server entry.");
        }

        const fallbackEntry = fallbackEntries[0];
        if (fallbackEntry) {
          return fallbackEntry;
        }

        throw new Error("No server entry found. Place Code.ts under serverDir.");
      }
    },
  };
}
