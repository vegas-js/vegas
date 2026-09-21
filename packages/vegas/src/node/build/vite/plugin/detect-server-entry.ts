import fs from "node:fs";
import path from "node:path";

import { defaultTreeAdapter, parse, type DefaultTreeAdapterTypes } from "parse5";
import { type Plugin, parseSync, Visitor } from "vite";

import type { BuildPlan } from "../../plan";

export const VIRTUAL_DETECT_SERVER_ENTRY = "virtual:detectserverentry";

const SERVER_ENTRY_FILE_NAMES = new Set(["Code.ts", "Code.js"]);

function isServerEntrySource(source: string): boolean {
  return SERVER_ENTRY_FILE_NAMES.has(path.basename(source));
}

interface ClientModuleReference {
  readonly source: string;
  readonly typeOnly: boolean;
}

function normalizeResolvedFileId(id: string): string {
  return path.normalize(id.replace(/[?#].*$/, ""));
}

function isVirtualServerEntryId(source: string, root: string): boolean {
  return (
    source === VIRTUAL_DETECT_SERVER_ENTRY ||
    path.normalize(source) === path.resolve(root, VIRTUAL_DETECT_SERVER_ENTRY)
  );
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

function collectClientHtmlModuleReferences(filePath: string): ClientModuleReference[] {
  const references: ClientModuleReference[] = [];
  const document = parse(fs.readFileSync(filePath, "utf8"));

  const visit = (parent: DefaultTreeAdapterTypes.ParentNode): void => {
    for (const child of defaultTreeAdapter.getChildNodes(parent)) {
      if (!defaultTreeAdapter.isElementNode(child)) {
        continue;
      }

      if (child.tagName === "script") {
        const attributes = defaultTreeAdapter.getAttrList(child);
        const type = attributes.find((attribute) => attribute.name === "type")?.value;

        if (type?.toLowerCase() === "module") {
          const source = attributes.find((attribute) => attribute.name === "src")?.value;

          if (source) {
            references.push({
              source,
              typeOnly: false,
            });
          }
        }
      }

      visit(child);
    }
  };

  visit(document);

  return references;
}

export function detectServerEntry(plan: BuildPlan): Plugin {
  const clientSourcesById = new Map(
    plan.clientSources.map((source) => [normalizeResolvedFileId(source), source]),
  );
  const serverSourcesById = new Map(
    plan.serverSources.map((source) => [normalizeResolvedFileId(source), source]),
  );

  return {
    name: "vite-plugin-detect-server-entry",

    applyToEnvironment(environment) {
      return environment.name === "server";
    },

    async resolveId(source, _importer, options) {
      if (isVirtualServerEntryId(source, plan.root)) {
        const serverEntries = new Set<string>();
        const visitedClientSources = new Set<string>();
        const pendingClientSources = plan.clientModuleTargets.map((entry) => entry.sourcePath);

        for (const htmlEntry of plan.clientHtmlTargets) {
          const references = collectClientHtmlModuleReferences(htmlEntry.sourcePath);

          for (const reference of references) {
            const resolvedId = await this.resolve(reference.source, htmlEntry.sourcePath, options);

            if (resolvedId === null) {
              continue;
            }

            const normalizedId = normalizeResolvedFileId(resolvedId.id);

            if (serverSourcesById.has(normalizedId)) {
              throw new Error("Server sources may only be referenced from client code as types.");
            }

            const clientSource = clientSourcesById.get(normalizedId);

            if (clientSource && !visitedClientSources.has(clientSource)) {
              pendingClientSources.push(clientSource);
            }
          }
        }

        while (pendingClientSources.length > 0) {
          const clientSourcePath = pendingClientSources.pop();

          if (!clientSourcePath || visitedClientSources.has(clientSourcePath)) {
            continue;
          }

          visitedClientSources.add(clientSourcePath);

          const references = collectClientModuleReferences(clientSourcePath);

          for (const reference of references) {
            const resolvedId = await this.resolve(reference.source, clientSourcePath, options);

            if (resolvedId === null) {
              continue;
            }

            const normalizedId = normalizeResolvedFileId(resolvedId.id);
            const serverSource = serverSourcesById.get(normalizedId);

            if (serverSource) {
              if (!reference.typeOnly) {
                throw new Error("Server sources may only be referenced from client code as types.");
              }

              if (!isServerEntrySource(serverSource)) {
                throw new Error(
                  "The only files that can be imported from the server side are Code.ts and Code.js",
                );
              }

              serverEntries.add(serverSource);
              continue;
            }

            const clientSource = clientSourcesById.get(normalizedId);

            if (clientSource && !visitedClientSources.has(clientSource)) {
              pendingClientSources.push(clientSource);
            }
          }
        }

        if (serverEntries.size > 1) {
          throw new Error("Duplicate server entry.");
        }

        const serverEntry = serverEntries.values().next().value;

        if (serverEntry) {
          return serverEntry;
        }

        const fallbackEntries = plan.serverSources.filter(isServerEntrySource);
        if (fallbackEntries.length > 1) {
          throw new Error("Duplicate server entry.");
        }

        const fallbackEntry = fallbackEntries[0];
        if (fallbackEntry) {
          return fallbackEntry;
        }

        throw new Error("No server entry found. Place Code.ts or Code.js under serverDir.");
      }
    },
  };
}
