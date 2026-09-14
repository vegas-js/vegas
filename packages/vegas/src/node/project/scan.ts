import type { GlobOptionsWithoutFileTypes } from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";

import { createClientEntries } from "./entries";
import type { ProjectSnapshot, ResolvedProject } from "./type";

async function collectWithGlob(
  pattern: string | readonly string[],
  options: GlobOptionsWithoutFileTypes = {},
) {
  const files: string[] = [];
  for await (const entry of fsPromises.glob(pattern, options)) {
    files.push(entry);
  }

  return files;
}

function excludeDeclarationFile(fileName: string) {
  return fileName.endsWith(".d.ts");
}

export async function scanProject(project: ResolvedProject): Promise<ProjectSnapshot> {
  const [clientSources, serverSources, gasMockSources] = await Promise.all([
    collectWithGlob(
      [path.join(project.clientDir, "**", "*.ts"), path.join(project.clientDir, "**", "*.tsx")],
      { exclude: excludeDeclarationFile },
    ),

    collectWithGlob(path.join(project.serverDir, "**", "*.ts"), {
      exclude: excludeDeclarationFile,
    }),

    collectWithGlob(path.join(project.gasMockDir, "**", "*.ts"), {
      exclude: excludeDeclarationFile,
    }),
  ]);

  const sortedClientSources = clientSources.sort();
  const sortedServerSources = serverSources.sort();
  const sortedGasMockSources = gasMockSources.sort();

  return {
    clientSources: sortedClientSources,
    serverSources: sortedServerSources,
    gasMockSources: sortedGasMockSources,
    clientEntries:
      project.appType === "spa" ? createClientEntries(project.clientDir, sortedClientSources) : [],
  };
}
