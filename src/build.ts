import { existsSync, mkdtempDisposableSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, parse, resolve } from "node:path";
import { build } from "rolldown";
import { parseSync } from "vite";

import { ResolvedUserConfig, UserConfig } from "./lib";

function resolvePath(rawPath?: string) {
  const absolutePath = rawPath ? (isAbsolute(rawPath) ? rawPath : resolve(rawPath)) : process.cwd();
  if (!existsSync(absolutePath)) {
    throw new Error("The directory specified by root does not exist.");
  }
  return absolutePath;
}

async function transpileConfig(root: string, outputDir: string) {
  const configPath = join(root, "vegas.config.ts");
  if (!existsSync(configPath)) {
    throw new Error("vegas.config.ts is required.");
  }
  const result = await build({
    input: configPath,
    external: () => true,
    cwd: root,
    treeshake: false,
    tsconfig: false,
    output: {
      dir: outputDir,
    },
  });
  const output = result.output[0];
  return join(outputDir, output.fileName);
}

async function loadConfig(root: string): Promise<UserConfig> {
  const tempDirPrefix = join(root, "node_modules", "vegas-");
  using tempDir = mkdtempDisposableSync(tempDirPrefix);
  const transpiledConfigPath = await transpileConfig(root, tempDir.path);
  const rawModule: { default: unknown } = await import(transpiledConfigPath);
  if (!rawModule.default) {
    throw new Error("config must export or return an object.");
  }
  return rawModule.default;
}

function resolveConfig(userConfig: UserConfig): ResolvedUserConfig {
  const root = userConfig.root
    ? isAbsolute(userConfig.root)
      ? userConfig.root
      : resolve(userConfig.root)
    : process.cwd();
  const webDir = resolve(join(root, userConfig.webDir ?? join("src", "web")));
  const serverDir = resolve(join(root, userConfig.webDir ?? join("src", "server")));
  // const gasMockDir = resolve(join(root, userConfig.webDir ?? "mock"));
  const plugins = userConfig.plugins ?? [];

  return { root, webDir, serverDir, plugins };
}

type ProjectSource = {
  webSources: string[];
  serverSources: string[];
  // gasMockSources: string[];
};

function recursiveCollectFiles(dir: string, targetExts: string[], excludeDirs: string[]) {
  const filePaths: string[] = [];
  const entryDir = readdirSync(dir, { withFileTypes: true });
  entryDir.forEach((entry) => {
    const absolutePath = resolve(join(entry.parentPath, entry.name));
    if (entry.isFile() && targetExts.includes(parse(absolutePath).ext)) {
      filePaths.push(absolutePath);
    } else if (entry.isDirectory() && !excludeDirs.includes(entry.name)) {
      recursiveCollectFiles(absolutePath, targetExts, excludeDirs).forEach((filePath) =>
        filePaths.push(filePath),
      );
    }
  });

  return filePaths;
}

function collectSources(userConfig: ResolvedUserConfig): ProjectSource {
  const excludeDirs = ["node_modules", ".git"];
  const webSources = recursiveCollectFiles(userConfig.webDir, [".ts", ".tsx"], excludeDirs);
  const serverSources = recursiveCollectFiles(userConfig.serverDir, [".ts"], excludeDirs);
  // const gasMockSources = recursiveCollectFiles(userConfig.gasMockDir, [".ts"], excludeDirs);

  return {
    webSources,
    serverSources,
    // gasMockSources,
  };
}

function detectWebEntries(webSources: string[]) {
  return webSources.filter((source) => parse(source).base === "main.tsx");
}

function detectServerEntry(webSources: string[], serverSources: string[]) {
  const serverEntries: string[] = [];
  webSources.forEach((webSource) => {
    const { program } = parseSync(webSource, readFileSync(webSource, { encoding: "utf8" }));
    program.body.forEach((node) => {
      if (node.type === "ImportDeclaration") {
        const sourceDir = parse(webSource).dir;
        const importPath = node.source.value;
        const importAbsolutePath = `${resolve(sourceDir, importPath)}.ts`;
        if (serverSources.includes(importAbsolutePath)) {
          serverEntries.push(importAbsolutePath);
        }
      }
    });
  });

  if (serverEntries.length > 1) {
    throw new Error("Duplicate server entry.");
  }

  return serverEntries.length === 1 ? serverEntries[0] : null;
}

type ProjectEntry = {
  webEntries: string[];
  serverEntry: string | null;
};

function detectEntries(projectSource: ProjectSource): ProjectEntry {
  const webEntries = detectWebEntries(projectSource.webSources);
  const serverEntry = detectServerEntry(projectSource.webSources, projectSource.serverSources);

  return { webEntries, serverEntry };
}

export async function runBuild(root?: string) {
  const resolvedRoot = resolvePath(root);
  const userConfig = await loadConfig(resolvedRoot);
  const resolvedUserConfig = resolveConfig(userConfig);
  const projectSource = collectSources(resolvedUserConfig);
  const projectEntry = detectEntries(projectSource);

  console.log("it works!");
  console.log(`root is ${resolvedRoot}`);
  console.log(resolvedUserConfig);
  console.log(projectSource);
  console.log(projectEntry);
}
