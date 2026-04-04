import fs from "node:fs";
import path from "node:path";

import { parseSync, Plugin, Visitor } from "vite";

import { ProjectSource } from "../analyze";
import { ResolvedUserConfig } from "../config";

export const VIRTUAL_DETECT_SERVER_ENTRY = "virtual:detectserverentry";

export function detectServerEntry(
  config: ResolvedUserConfig,
  projectSource: ProjectSource,
): Plugin {
  return {
    name: "vite-plugin-detectserverentry",

    applyToEnvironment(environment) {
      return environment.name === "server";
    },

    async resolveId(source, _importer, options) {
      if (source.endsWith(VIRTUAL_DETECT_SERVER_ENTRY)) {
        const serverEntries: string[] = [];
        const importMap: Map<string, string[]> = new Map();
        projectSource.clientSources.forEach((clientSource) => {
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

        const fallback1 = projectSource.serverSources.find(
          (source) => path.parse(source).base === "Code.ts",
        );

        if (fallback1) {
          return fallback1;
        }

        if (config.appType === "script") {
          const fallback2 = path.resolve(config.root, "src", "Code.ts");
          if (fs.existsSync(fallback2)) {
            return fallback2;
          } else {
            throw new Error("No server entry found. Place Code.ts under srcDir.");
          }
        } else {
          throw new Error("No server entry found. Place Code.ts under serverDir.");
        }
      }
    },
  };
}
