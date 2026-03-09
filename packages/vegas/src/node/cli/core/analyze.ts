import fs from "node:fs";
import path from "node:path";

import { parseSync, Visitor } from "vite";

import { ResolvedUserConfig } from "./config";

export type ProjectSource = {
  webSources: string[];
  serverSources: string[];
  gasMockSources: string[];
};

function recursiveCollectFiles(dir: string, excludeDirs?: string[]) {
  const filePaths: string[] = [];
  const entryDir = fs.readdirSync(dir, { withFileTypes: true });
  entryDir.forEach((entry) => {
    const absolutePath = path.resolve(path.join(dir, entry.name));
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
  const exclude = ["node_modules", ".git"];
  function dtsExcludeFilter(filePath: string) {
    return !filePath.endsWith(".d.ts");
  }

  const webDirGlobPrefix = path.join(userConfig.webDir, "**");
  const webGlobPatterns = [
    path.join(webDirGlobPrefix, "*.ts"),
    path.join(webDirGlobPrefix, "*.tsx"),
  ];
  const webSources = fs.globSync(webGlobPatterns, { exclude }).filter(dtsExcludeFilter);

  const serverDirGlobPrefix = path.join(userConfig.serverDir, "**");
  const serverSources = fs
    .globSync(path.join(serverDirGlobPrefix, "*.ts"), { exclude })
    .filter(dtsExcludeFilter);

  const gasMockDirGlobPrefix = path.join(userConfig.gasMockDir, "**");
  const gasMockSources = fs
    .globSync(path.join(gasMockDirGlobPrefix, "*.ts"), { exclude })
    .filter(dtsExcludeFilter);

  return {
    webSources,
    serverSources,
    gasMockSources,
  };
}

function detectWebEntries(webSources: string[]) {
  return webSources.filter((source) => /^main\.tsx?$/.test(path.parse(source).base));
}

function detectServerEntry(webSources: string[], serverSources: string[]) {
  const serverEntries: string[] = [];
  webSources.forEach((webSource) => {
    const { program } = parseSync(webSource, fs.readFileSync(webSource, { encoding: "utf8" }));
    const visitor = new Visitor({
      ImportDeclaration(node) {
        const sourceDir = path.parse(webSource).dir;
        const importPath = path.resolve(sourceDir, node.source.value);
        const importAbsolutePath = importPath.endsWith(".ts") ? importPath : `${importPath}.ts`;
        /* memo */
        // createBuilder()
        //   .then((builder) => {
        //     const resolver = createIdResolver(builder.environments.client.config, {});
        //     resolver(builder.environments.client, node.source.value, webSource)
        //       .then((resolvedPath) => console.log(node.source.value, "=>", resolvedPath))
        //       .catch(() => {});
        //   })
        //   .catch(() => {});
        if (serverSources.includes(importAbsolutePath)) {
          if (path.parse(importAbsolutePath).base !== "Code.ts") {
            throw new Error("The only file that can be imported from the server side is Code.ts");
          }
          serverEntries.push(importAbsolutePath);
        }
      },
    });

    visitor.visit(program);
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
    const relativeDirname = path.relative(config.webDir, path.parse(entryPath).dir);
    const outputPath = relativeDirname
      ? `${relativeDirname}.html`
      : path.join(relativeDirname, "index.html");
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
    const size = fs.statSync(filePath).size;
    const relativePath = path.relative(outDir, filePath);
    return { path: relativePath, size };
  });
}
