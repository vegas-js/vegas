import fs from "node:fs";
import path from "node:path";

import { parseSync } from "vite";

export function detectClientEntries(clientSources: readonly string[]) {
  const clientEntries = clientSources.filter((source) =>
    /^main\.tsx?$/.test(path.parse(source).base),
  );
  return clientEntries;
}

export function isWebApp(dir: string) {
  const sourcePath = path.join(dir, "Code.js");
  if (fs.existsSync(sourcePath)) {
    const source = fs.readFileSync(sourcePath, "utf8");
    const { program } = parseSync(sourcePath, source);
    for (const node of program.body) {
      if (node.type === "FunctionDeclaration" && node.id) {
        if (/^do(Get|Post)$/.test(node.id.name)) {
          return true;
        }
      }
    }
  }
  return false;
}
