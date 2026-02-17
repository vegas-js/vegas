import { rmSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { styleText } from "node:util";
import { build as buildWithRolldown, VERSION as ROLLDOWN_VERSION } from "rolldown";
import { build as buildWithVite, version as VITE_VERSION } from "vite";

import { version as VEGAS_VERSION } from "../../../package.json";
import {
  BuildArtifact,
  collectArtifacts,
  collectSources,
  detectEntries,
  ProjectEntry,
} from "../analyze";
import { loadConfig, resolveConfig, ResolvedUserConfig } from "../config";
import { resolvePath } from "../path";
import { exportBridge } from "./plugins/exportbridge";
import { virtualHTML } from "./plugins/virtualhtml";

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
  const iifeName = "GASApp";
  return buildWithRolldown({
    cwd: config.root,
    input: serverEntry,
    plugins: [exportBridge(serverEntry)],
    output: {
      format: "iife",
      name: iifeName,
      exports: "named",
      dir: config.output.dir,
      footer: `Object.assign(globalThis, ${iifeName});\n`,
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
