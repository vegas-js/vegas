import type { GlobOptionsWithoutFileTypes } from "node:fs";
import fsPromises from "node:fs/promises";

import { createClientEntries } from "./entries";
import { createSourceGlobPatterns, isDeclarationSource } from "./source";
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

export async function scanRuntimeDataSources(project: ResolvedProject): Promise<string[]> {
  const sources = await collectWithGlob(
    createSourceGlobPatterns(project.runtimeDataDir, "runtimeData"),
    { exclude: isDeclarationSource },
  );

  return sources.sort();
}

export async function scanProject(project: ResolvedProject): Promise<ProjectSnapshot> {
  const [clientSources, serverSources, runtimeDataSources] = await Promise.all([
    collectWithGlob(createSourceGlobPatterns(project.clientDir, "client"), {
      exclude: isDeclarationSource,
    }),

    collectWithGlob(createSourceGlobPatterns(project.serverDir, "server"), {
      exclude: isDeclarationSource,
    }),

    scanRuntimeDataSources(project),
  ]);

  const runtimeDataSourceSet = new Set(runtimeDataSources);
  const sortedClientSources = clientSources
    .filter((source) => !runtimeDataSourceSet.has(source))
    .sort();
  const clientSourceSet = new Set(sortedClientSources);
  const sortedServerSources = serverSources
    .filter((source) => !runtimeDataSourceSet.has(source) && !clientSourceSet.has(source))
    .sort();

  return {
    clientSources: sortedClientSources,
    serverSources: sortedServerSources,
    runtimeDataSources,
    clientEntries:
      project.appType === "spa" ? createClientEntries(project.clientDir, sortedClientSources) : [],
  };
}
