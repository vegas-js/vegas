import fs from "node:fs";
import path from "node:path";

import { parseSync } from "vite";

import type { ResolvedProject } from "../../project";

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

export async function collectSources(project: ResolvedProject): Promise<ProjectSource> {
  function exclude(fileName: string) {
    return fileName.endsWith(".d.ts");
  }

  const clientDirGlobPrefix = path.join(project.clientDir, "**");
  const clientGlobPatterns = [
    path.join(clientDirGlobPrefix, "*.ts"),
    path.join(clientDirGlobPrefix, "*.tsx"),
  ];
  const clientGlobSearchPromise = collectWithGlob(clientGlobPatterns, { exclude });

  const serverDirGlobPrefix = path.join(project.serverDir, "**");
  const serverGlobPattern = path.join(serverDirGlobPrefix, "*.ts");
  const serverGlobSearchPromise = collectWithGlob(serverGlobPattern, { exclude });

  const gasMockDirGlobPrefix = path.join(project.gasMockDir, "**");
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
