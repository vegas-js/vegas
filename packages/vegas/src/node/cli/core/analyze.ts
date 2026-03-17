import fs from "node:fs";
import path from "node:path";

import { ResolvedUserConfig } from "./config";

export type ProjectSource = {
  webSources: string[];
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

  const webDirGlobPrefix = path.join(userConfig.webDir, "**");
  const webGlobPatterns = [
    path.join(webDirGlobPrefix, "*.ts"),
    path.join(webDirGlobPrefix, "*.tsx"),
  ];
  const webGlobSearchPromise = collectWithGlob(webGlobPatterns, { exclude });

  const serverDirGlobPrefix = path.join(userConfig.serverDir, "**");
  const serverGlobPattern = path.join(serverDirGlobPrefix, "*.ts");
  const serverGlobSearchPromise = collectWithGlob(serverGlobPattern, { exclude });

  const gasMockDirGlobPrefix = path.join(userConfig.gasMockDir, "**");
  const gasMockGlobPattern = path.join(gasMockDirGlobPrefix, "*.ts");
  const gasMockGlobSearchPromise = collectWithGlob(gasMockGlobPattern, { exclude });

  const [webSources, serverSources, gasMockSources] = await Promise.all([
    webGlobSearchPromise,
    serverGlobSearchPromise,
    gasMockGlobSearchPromise,
  ]);

  return {
    webSources,
    serverSources,
    gasMockSources,
  };
}

export function detectWebEntries(webSources: string[]) {
  const webEntries = webSources.filter((source) => /^main\.tsx?$/.test(path.parse(source).base));
  if (webEntries.length === 0) {
    throw new Error("No web entry found. Place main.ts or main.tsx under webDir.");
  }
  return webEntries;
}
