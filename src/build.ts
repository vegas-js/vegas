import {
  existsSync,
  mkdtempDisposableSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, parse, relative, resolve } from "node:path";
import { build as buildWithRolldown } from "rolldown";
import { build as buildWithVite, HtmlTagDescriptor, parseSync, Plugin } from "vite";

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
    dir: userConfig.output?.dir ?? "dist",
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

function buildServerApp(config: ResolvedUserConfig, serverEntry: string) {
  return buildWithRolldown({
    cwd: config.root,
    input: serverEntry,
    output: {
      entryFileNames: "Code.ts",
      format: "iife",
      name: "GASApp",
      exports: "named",
      dir: config.output.dir,
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

export async function runBuild(root?: string) {
  const resolvedRoot = resolvePath(root);
  const userConfig = await loadConfig(resolvedRoot);
  const resolvedUserConfig = resolveConfig(userConfig);
  const projectSource = collectSources(resolvedUserConfig);
  const projectEntry = detectEntries(projectSource);
  await buildApp(resolvedUserConfig, projectEntry);
  generateManifest(resolvedUserConfig);

  console.log("it works!");
  console.log(`root is ${resolvedRoot}`);
  console.log(resolvedUserConfig);
  console.log(projectSource);
  console.log(projectEntry);
}
