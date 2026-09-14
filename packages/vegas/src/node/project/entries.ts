import path from "node:path";

import type { ClientEntry } from "./type";

export function createClientEntries(clientDir: string, sources: readonly string[]): ClientEntry[] {
  const entries: ClientEntry[] = [];
  const ids = new Set<string>();

  for (const source of sources) {
    if (!/^main\.tsx?$/.test(path.basename(source))) {
      continue;
    }

    const relativeDir = path.relative(clientDir, path.dirname(source));
    const id = relativeDir === "" ? "index" : relativeDir.split(path.sep).join("/");

    if (ids.has(id)) {
      throw new Error(`Duplicate client entry: ${id}`);
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
