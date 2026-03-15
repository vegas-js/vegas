import fs from "node:fs";
import path from "node:path";

import { parseSync, Plugin, Visitor } from "vite";

import { ProjectSource } from "../../core/analyze";

export const VIRTUAL_DETECT_SERVER_ENTRY = "virtual:detectserverentry";

export function detectServerEntry(projectSource: ProjectSource): Plugin {
  return {
    name: "vite-plugin-detectserverentry",

    applyToEnvironment(environment) {
      return !environment.name.startsWith("web");
    },

    async resolveId(source, _importer, options) {
      if (source.endsWith(VIRTUAL_DETECT_SERVER_ENTRY)) {
        const serverEntries: string[] = [];
        const importMap: Map<string, string[]> = new Map();
        projectSource.webSources.forEach((webSource) => {
          const { program } = parseSync(
            webSource,
            fs.readFileSync(webSource, { encoding: "utf8" }),
          );
          const visitor = new Visitor({
            ImportDeclaration(node) {
              if (importMap.has(webSource)) {
                importMap.get(webSource)!.push(node.source.value);
              } else {
                importMap.set(webSource, [node.source.value]);
              }
            },
          });

          visitor.visit(program);
        });

        for (const [webSourcePath, imports] of importMap) {
          for (const importPath of imports) {
            const resolvedId = await this.resolve(importPath, webSourcePath, options);
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
