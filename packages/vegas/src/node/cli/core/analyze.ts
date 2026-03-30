import fs from "node:fs";
import path from "node:path";

import { parseSync } from "vite";

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
  return clientEntries;
}

export function isWebApp(serverSource: string) {
  let isWebApp = false;
  if (serverSource) {
    const { program } = parseSync("Code.ts", serverSource);
    program.body.forEach((node) => {
      if (node.type === "FunctionDeclaration" && node.id) {
        if (node.id.name === "doGet" || node.id.name === "doPost") {
          isWebApp = true;
        }
      }
    });
  }
  return isWebApp;
}
