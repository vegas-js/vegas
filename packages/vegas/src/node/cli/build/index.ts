import fs from "node:fs";
import path from "node:path";
import util from "node:util";

import { build as buildWithRolldown, VERSION as ROLLDOWN_VERSION } from "rolldown";
import { build as buildWithVite, version as VITE_VERSION } from "vite";

import { version as VEGAS_VERSION } from "../../../../package.json";
import { resolvePath } from "../core";
import { collectArtifacts, collectSources, detectEntries, ProjectEntry } from "../core/analyze";
import { loadConfig, resolveConfig, ResolvedUserConfig } from "../core/config";
import { exportBridge } from "./plugins/exportbridge";
import { virtualHTML } from "./plugins/virtualhtml";
import { printReport } from "./printReport";

export function buildWebApp(
  config: ResolvedUserConfig,
  webEntries: string[],
  isWrite: boolean = true,
) {
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
        write: isWrite,
      },
      logLevel: "silent",
    });
  });
}

export function buildServerApp(
  config: ResolvedUserConfig,
  serverEntry: string,
  isWrite: boolean = true,
) {
  return buildWithRolldown({
    cwd: config.root,
    input: serverEntry,
    plugins: [exportBridge(serverEntry)],
    output: {
      format: "iife",
      name: "GASApp",
      exports: "named",
      dir: config.output.dir,
    },
    write: isWrite,
  });
}

async function buildApp(config: ResolvedUserConfig, projectEntry: ProjectEntry) {
  fs.rmSync(config.output.dir, { recursive: true, force: true });
  const promiseBuilds = buildWebApp(config, projectEntry.webEntries);
  if (projectEntry.serverEntry) {
    promiseBuilds.push(buildServerApp(config, projectEntry.serverEntry));
  }

  await Promise.all(promiseBuilds);
}

function generateManifest(config: ResolvedUserConfig) {
  fs.writeFileSync(
    path.join(config.output.dir, "appsscript.json"),
    JSON.stringify(config.gas, null, 2),
    {
      encoding: "utf8",
    },
  );
}

function printBanner() {
  const vegasId = util.styleText("cyan", `vegas v${VEGAS_VERSION}`);
  const byVite = util.styleText("magenta", `vite v${VITE_VERSION}`);
  const byRolldown = util.styleText("red", `rolldown v${ROLLDOWN_VERSION}`);
  const message = util.styleText("green", "building client environment for production...");
  const poweredBy = `${util.styleText("dim", "> powered by")} ${byVite} ${util.styleText("dim", "and")} ${byRolldown}\n`;
  console.log(vegasId, message);
  console.log(poweredBy);
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
