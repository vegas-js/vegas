import fs from "node:fs";
import path from "node:path";

import { ResolvedUserConfig } from "./config";

export type ProjectSource = {
  clientSources: string[];
  serverSources: string[];
  gasMockSources: string[];
};

async function collectWithGlob(
  pattern: string | readonly string[],
  options: fs.GlobOptionsWithoutFileTypes = {},
) {
  const files: string[] = [];
  for await (const entry of fs.promises.glob(pattern, options)) {
    files.push(entry);
  }

  return files;
}

export async function collectSources(userConfig: ResolvedUserConfig): Promise<ProjectSource> {
  function exclude(fileName: string) {
    return fileName.endsWith(".d.ts");
  }

  const clientDirGlobPrefix = path.join(userConfig.clientDir, "**");
  const clientGlobPatterns = [
    path.join(clientDirGlobPrefix, "*.ts"),
    path.join(clientDirGlobPrefix, "*.tsx"),
  ];
  const clientGlobSearchPromise = collectWithGlob(clientGlobPatterns, { exclude });

  const serverDirGlobPrefix = path.join(userConfig.serverDir, "**");
  const serverGlobPattern = path.join(serverDirGlobPrefix, "*.ts");
  const serverGlobSearchPromise = collectWithGlob(serverGlobPattern, { exclude });

  const gasMockDirGlobPrefix = path.join(userConfig.gasMockDir, "**");
  const gasMockGlobPattern = path.join(gasMockDirGlobPrefix, "*.ts");
  const gasMockGlobSearchPromise = collectWithGlob(gasMockGlobPattern, { exclude });

  const [clientSources, serverSources, gasMockSources] = await Promise.all([
    clientGlobSearchPromise,
    serverGlobSearchPromise,
    gasMockGlobSearchPromise,
  ]);

  return {
    clientSources,
    serverSources,
    gasMockSources,
  };
}

export function detectClientEntries(clientSources: string[]) {
  const clientEntries = clientSources.filter((source) =>
    /^main\.tsx?$/.test(path.parse(source).base),
  );
  if (clientEntries.length === 0) {
    throw new Error("No client entry found. Place main.ts or main.tsx under clientDir.");
  }
  return clientEntries;
}
