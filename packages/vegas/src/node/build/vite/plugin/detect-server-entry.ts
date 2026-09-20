import fs from "node:fs";
import path from "node:path";

import { type Plugin, parseSync, Visitor } from "vite";

import type { BuildPlan } from "../../plan";

export const VIRTUAL_DETECT_SERVER_ENTRY = "virtual:detectserverentry";

function normalizeResolvedFileId(id: string): string {
  return path.normalize(id.replace(/[?#].*$/, ""));
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
        const importMap: Map<string, string[]> = new Map();

        plan.clientSources.forEach((clientSource) => {
          const { program } = parseSync(clientSource, fs.readFileSync(clientSource, "utf8"));
          const visitor = new Visitor({
            ImportDeclaration(node) {
              const imports = importMap.get(clientSource);
              if (imports) {
                imports.push(node.source.value);
              } else {
                importMap.set(clientSource, [node.source.value]);
              }
            },
          });

          visitor.visit(program);
        });

        for (const [clientSourcePath, imports] of importMap) {
          for (const importPath of imports) {
            const resolvedId = await this.resolve(importPath, clientSourcePath, options);
            const serverSource =
              resolvedId === null
                ? undefined
                : serverSourcesById.get(normalizeResolvedFileId(resolvedId.id));

            if (serverSource) {
              if (path.parse(serverSource).base !== "Code.ts") {
                throw new Error(
                  "The only file that can be imported from the server side is Code.ts",
                );
              }
              serverEntries.add(serverSource);
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
