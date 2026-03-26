import fs from "node:fs";
import path from "node:path";

import { parseSync, Plugin, Visitor } from "vite";

import { ProjectSource } from "../../core/analyze";

export const VIRTUAL_DETECT_SERVER_ENTRY = "virtual:detectserverentry";

export function detectServerEntry(projectSource: ProjectSource): Plugin {
  return {
    name: "vite-plugin-detectserverentry",

    applyToEnvironment(environment) {
      return environment.name.startsWith("server");
    },

    async resolveId(source, _importer, options) {
      if (source.endsWith(VIRTUAL_DETECT_SERVER_ENTRY)) {
        const serverEntries: string[] = [];
        const importMap: Map<string, string[]> = new Map();
        projectSource.clientSources.forEach((clientSource) => {
          const { program } = parseSync(
            clientSource,
            fs.readFileSync(clientSource, { encoding: "utf8" }),
          );
          const visitor = new Visitor({
            ImportDeclaration(node) {
              if (importMap.has(clientSource)) {
                importMap.get(clientSource)!.push(node.source.value);
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
            if (resolvedId && projectSource.serverSources.includes(resolvedId.id)) {
              if (path.parse(resolvedId.id).base !== "Code.ts") {
                throw new Error(
                  "The only file that can be imported from the server side is Code.ts",
                );
              }
              serverEntries.push(resolvedId.id);
            }
          }
        }

        if (serverEntries.length > 1) {
          throw new Error("Duplicate server entry.");
        }

        if (serverEntries.length === 1) {
          return serverEntries[0];
        }

        const fallback = projectSource.serverSources.find(
          (source) => path.parse(source).base === "Code.ts",
        );

        if (!fallback) {
          throw new Error("No server entry found. Place Code.ts under serverDir.");
        }

        return fallback;
      }
    },
  };
}
