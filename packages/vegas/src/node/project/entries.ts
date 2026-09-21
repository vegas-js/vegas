import path from "node:path";

import type { ClientModuleEntry } from "./type";

function isClientModuleEntrySource(source: string): boolean {
  return path.parse(source).name === "main";
}

export function createClientModuleEntries(
  clientDir: string,
  sources: readonly string[],
): ClientModuleEntry[] {
  const entries: ClientModuleEntry[] = [];
  const ids = new Set<string>();

  for (const source of sources) {
    if (!isClientModuleEntrySource(source)) {
      continue;
    }

    const relativeDir = path.relative(clientDir, path.dirname(source));
    const id = relativeDir === "" ? "index" : relativeDir.split(path.sep).join("/");

    if (ids.has(id)) {
      throw new Error(`Duplicate client module entry: ${id}`);
    }

    ids.add(id);

    entries.push({
      id,
      sourcePath: source,
      htmlPath: `${id}.html`,
    });
  }

  return entries.sort((a, b) => {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}
