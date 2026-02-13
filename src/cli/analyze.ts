import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, parse, relative, resolve } from "node:path";
import { parseSync } from "vite";

import { ResolvedUserConfig } from "./config";

export type ProjectSource = {
  webSources: string[];
  serverSources: string[];
  // gasMockSources: string[];
};

function recursiveCollectFiles(dir: string, excludeDirs?: string[]) {
  const filePaths: string[] = [];
  const entryDir = readdirSync(dir, { withFileTypes: true });
  entryDir.forEach((entry) => {
    const absolutePath = resolve(join(dir, entry.name));
    if (entry.isFile()) {
      filePaths.push(absolutePath);
    } else if (entry.isDirectory() && !excludeDirs?.includes(entry.name)) {
      recursiveCollectFiles(absolutePath, excludeDirs).forEach((filePath) =>
        filePaths.push(filePath),
      );
    }
  });

  return filePaths;
}

export function collectSources(userConfig: ResolvedUserConfig): ProjectSource {
  const excludeDirs = ["node_modules", ".git"];
  const webSources = recursiveCollectFiles(userConfig.webDir, excludeDirs).filter((filePath) =>
    /(?!\.d)\.tsx?$/.test(filePath),
  );
  const serverSources = recursiveCollectFiles(userConfig.serverDir, excludeDirs).filter(
    (filePath) => /(?!\.d)\.ts$/.test(filePath),
  );
  // const gasMockSources = recursiveCollectFiles(userConfig.gasMockDir, excludeDirs).filter(
  //   (filePath) => [".ts"].includes(parse(filePath).ext),
  // );

  return {
    webSources,
    serverSources,
    // gasMockSources,
  };
}

function detectWebEntries(webSources: string[]) {
  return webSources.filter((source) => /^main\.tsx?$/.test(parse(source).base));
}

function detectServerEntry(webSources: string[], serverSources: string[]) {
  const serverEntries: string[] = [];
  webSources.forEach((webSource) => {
    const { program } = parseSync(webSource, readFileSync(webSource, { encoding: "utf8" }));
    program.body.forEach((node) => {
      if (node.type === "ImportDeclaration") {
        const sourceDir = parse(webSource).dir;
        const importPath = resolve(sourceDir, node.source.value);
        const importAbsolutePath = importPath.endsWith(".ts") ? importPath : `${importPath}.ts`;
        if (serverSources.includes(importAbsolutePath)) {
          if (parse(importAbsolutePath).base !== "Code.ts") {
            throw new Error("The only file that can be imported from the server side is Code.ts");
          }
          serverEntries.push(importAbsolutePath);
        }
      }
    });
  });

  if (serverEntries.length > 1) {
    throw new Error("Duplicate server entry.");
  }

  if (serverEntries.length === 0) {
    throw new Error("No server entry found.");
  }

  return serverEntries[0];
}

export type ProjectEntry = {
  webEntries: string[];
  serverEntry: string;
};

export function detectEntries(projectSource: ProjectSource): ProjectEntry {
  const webEntries = detectWebEntries(projectSource.webSources);
  if (webEntries.length === 0) {
    throw new Error("No web entry found. Place main.ts or main.tsx under webDir.");
  }
  const serverEntry = detectServerEntry(projectSource.webSources, projectSource.serverSources);

  return { webEntries, serverEntry };
}

export type ProjectIOMap = {
  entryPath: string;
  outputPath: string;
};

export function mappingProjectIO(config: ResolvedUserConfig, projectEntry: ProjectEntry) {
  const projectIOMap: ProjectIOMap[] = projectEntry.webEntries.map((entryPath) => {
    const relativeDirname = relative(config.webDir, parse(entryPath).dir);
    const outputPath = relativeDirname
      ? `${relativeDirname}.html`
      : join(relativeDirname, "index.html");
    return { entryPath, outputPath };
  });

  return projectIOMap;
}

export type BuildArtifact = {
  path: string;
  size: number;
};

export function collectArtifacts(outDir: string): BuildArtifact[] {
  return recursiveCollectFiles(outDir).map((filePath) => {
    const size = statSync(filePath).size;
    const relativePath = relative(outDir, filePath);
    return { path: relativePath, size };
  });
}
