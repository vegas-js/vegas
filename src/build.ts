import {
  existsSync,
  mkdtempDisposableSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import { styleText } from "node:util";
import {
  build as buildWithRolldown,
  Plugin as RolldownPlugin,
  VERSION as ROLLDOWN_VERSION,
} from "rolldown";
import {
  build as buildWithVite,
  HtmlTagDescriptor,
  parseSync,
  Plugin,
  version as VITE_VERSION,
} from "vite";

import { version as VEGAS_VERSION } from "../package.json";
import { GASManifest, ResolvedUserConfig, UserConfig } from "./lib";

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
  const result = await buildWithRolldown({
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
  const serverDir = resolve(join(root, userConfig.serverDir ?? join("src", "server")));
  // const gasMockDir = resolve(join(root, userConfig.webDir ?? "mock"));
  const plugins = userConfig.plugins ?? [];
  const output = {
    dir: resolve(join(root, userConfig.output?.dir ?? "dist")),
  };
  const gas: GASManifest = {
    dependencies: userConfig.gas?.dependencies,
    exceptionLogging: userConfig.gas?.exceptionLogging ?? "STACKDRIVER",
    oauthScopes: userConfig.gas?.oauthScopes,
    runtimeVersion: userConfig.gas?.runtimeVersion ?? "V8",
    timeZone: userConfig.gas?.timeZone ?? "UTC",
    webapp: {
      access: "MYSELF",
      executeAs: "USER_ACCESSING",
    },
  };

  return { root, webDir, serverDir, plugins, output, gas };
}

type ProjectSource = {
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

function collectSources(userConfig: ResolvedUserConfig): ProjectSource {
  const excludeDirs = ["node_modules", ".git"];
  const webSources = recursiveCollectFiles(userConfig.webDir, excludeDirs).filter((filePath) =>
    [".ts", ".tsx"].includes(parse(filePath).ext),
  );
  const serverSources = recursiveCollectFiles(userConfig.serverDir, excludeDirs).filter(
    (filePath) => parse(filePath).ext === ".ts",
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

type ProjectEntry = {
  webEntries: string[];
  serverEntry: string;
};

function detectEntries(projectSource: ProjectSource): ProjectEntry {
  const webEntries = detectWebEntries(projectSource.webSources);
  const serverEntry = detectServerEntry(projectSource.webSources, projectSource.serverSources);

  return { webEntries, serverEntry };
}

type VirtualHTMLOption = {
  webDir: string;
  webEntry: string;
};

function virtualHTML(option: VirtualHTMLOption): Plugin {
  return {
    name: "vite-plugin-virtualhtml",

    configResolved(config) {
      const relativeDirname = relative(option.webDir, parse(option.webEntry).dir);
      const htmlPath = relativeDirname
        ? `${relativeDirname}.html`
        : join(relativeDirname, "index.html");
      config.build.rolldownOptions.input = htmlPath;
    },

    resolveId(source, _importer, _options) {
      if (source.endsWith(".html")) {
        return source;
      }
    },

    load(id, _options) {
      if (id.endsWith(".html")) {
        return `<script type="module" src="${option.webEntry}"></script>`;
      }
    },

    transformIndexHtml(_html, ctx) {
      const bundle = ctx.bundle;
      if (!bundle) {
        return;
      }
      const injectTags: HtmlTagDescriptor[] = [];
      Object.keys(bundle).forEach((key) => {
        const output = bundle[key];
        const name = output.fileName;
        if (output.type === "asset") {
          if (name.endsWith(".css")) {
            injectTags.push({
              tag: "style",
              children: output.source.toString(),
              injectTo: "head",
            });
            delete bundle[key];
          } else {
            console.log(`no processing: ${JSON.stringify(name)}`);
          }
        } else if (output.type === "chunk") {
          if (name.endsWith(".js")) {
            injectTags.push({
              tag: "script",
              children: output.code,
              attrs: { type: "module" },
              injectTo: "body",
            });
            delete bundle[key];
          } else {
            console.log(`no processing: ${JSON.stringify(name)}`);
          }
        } else {
          console.log(`no processing: ${JSON.stringify(name)}`);
        }
      });

      return {
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>`,
        tags: injectTags,
      };
    },
  };
}

function buildWebApp(config: ResolvedUserConfig, webEntries: string[]) {
  return webEntries.map((entry) => {
    return buildWithVite({
      root: config.root,
      configFile: false,
      plugins: [...config.plugins, virtualHTML({ webDir: config.webDir, webEntry: entry })],
      build: {
        rolldownOptions: {
          input: entry,
        },
        outDir: config.output.dir,
        emptyOutDir: false,
      },
      logLevel: "silent",
    });
  });
}

function gasExport(): RolldownPlugin {
  return {
    name: "rolldown-plugin-gasexport",

    renderChunk(_code, _chunk, outputOptions, meta) {
      const magicString = meta.magicString;
      if (!magicString) {
        return;
      }

      magicString.append(`\nObject.assign(globalThis, ${outputOptions.name});`);

      return { code: magicString.toString() };
    },
  };
}

function buildServerApp(config: ResolvedUserConfig, serverEntry: string) {
  return buildWithRolldown({
    cwd: config.root,
    input: serverEntry,
    plugins: [gasExport()],
    output: {
      format: "iife",
      name: "GASApp",
      exports: "named",
      dir: config.output.dir,
    },
    experimental: {
      nativeMagicString: true,
    },
  });
}

async function buildApp(config: ResolvedUserConfig, projectEntry: ProjectEntry) {
  rmSync(config.output.dir, { recursive: true, force: true });
  const promiseBuilds = buildWebApp(config, projectEntry.webEntries);
  if (projectEntry.serverEntry) {
    promiseBuilds.push(buildServerApp(config, projectEntry.serverEntry));
  }

  await Promise.all(promiseBuilds);
}

function generateManifest(config: ResolvedUserConfig) {
  writeFileSync(join(config.output.dir, "appsscript.json"), JSON.stringify(config.gas, null, 2), {
    encoding: "utf8",
  });
}

type BuildArtifact = {
  path: string;
  size: number;
};

function collectArtifacts(outDir: string): BuildArtifact[] {
  return recursiveCollectFiles(outDir).map((filePath) => {
    const size = statSync(filePath).size;
    const relativePath = relative(outDir, filePath);
    return { path: relativePath, size };
  });
}

function printBanner() {
  const vegasId = styleText("cyan", `vegas v${VEGAS_VERSION}`);
  const byVite = styleText("magenta", `vite v${VITE_VERSION}`);
  const byRolldown = styleText("red", `rolldown v${ROLLDOWN_VERSION}`);
  const message = styleText("green", "building client environment for production...");
  const poweredBy = `${styleText("dim", "> powered by")} ${byVite} ${styleText("dim", "and")} ${byRolldown}\n`;
  console.log(vegasId, message);
  console.log(poweredBy);
}

function formatSize(bytes: number): string {
  const units = ["B", "kB", "mB"];
  let size = bytes;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }

  return `${size.toFixed(2)} ${units[unit].padStart(2)}`;
}

function printReport(config: ResolvedUserConfig, artifacts: BuildArtifact[], durationMs: number) {
  const basePath = styleText("dim", `${relative(config.root, config.output.dir)}${sep}`);

  const rows = artifacts.map((artifact) => ({
    path: artifact.path,
    size: formatSize(artifact.size),
  }));

  const maxPathLength = Math.max(...rows.map((artifact) => artifact.path.length));
  const maxSizeLength = Math.max(...rows.map((artifact) => artifact.size.toString().length));

  const lines = rows.map(({ path: filePath, size }) => {
    const paddedPath = filePath.padEnd(maxPathLength);
    const paddedSize = size.padStart(maxSizeLength);

    const coloredPath = `${styleText("dim", basePath)}${styleText("green", paddedPath)}`;
    const coloredSize = `${styleText(["dim", "bold"], paddedSize)}`;

    return `${coloredPath}  ${coloredSize}`;
  });

  console.log(lines.join("\n"));
  console.log(styleText("green", `\n✓ built in ${durationMs.toFixed(0)}ms`));
}

export async function runBuild(root?: string) {
  printBanner();
  const resolvedRoot = resolvePath(root);
  const userConfig = await loadConfig(resolvedRoot);
  const resolvedUserConfig = resolveConfig(userConfig);
  const projectSource = collectSources(resolvedUserConfig);
  const projectEntry = detectEntries(projectSource);
  const startTime = performance.now();
  await buildApp(resolvedUserConfig, projectEntry);
  generateManifest(resolvedUserConfig);
  const endTime = performance.now();
  const artifacts = collectArtifacts(resolvedUserConfig.output.dir).sort((a, b) =>
    a.path.localeCompare(b.path),
  );
  printReport(resolvedUserConfig, artifacts, endTime - startTime);
}
