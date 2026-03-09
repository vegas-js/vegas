import fs from "node:fs";
import path from "node:path";
import util from "node:util";

import type { RolldownOutput } from "rolldown";
import { createBuilder, EnvironmentOptions, version as VITE_VERSION } from "vite";

import { version as VEGAS_VERSION } from "../../../../package.json";
import { resolvePath } from "../core";
import { collectArtifacts, collectSources, detectEntries, ProjectEntry } from "../core/analyze";
import { loadConfig, resolveConfig, ResolvedUserConfig } from "../core/config";
import { exportBridge } from "./plugins/exportbridge";
import { virtualHTML } from "./plugins/virtualhtml";
import { printReport } from "./printReport";

export async function buildApp(
  config: ResolvedUserConfig,
  projectEntry: ProjectEntry,
  isWrite?: boolean,
  envFilter?: RegExp,
) {
  fs.rmSync(config.output.dir, { recursive: true, force: true });
  const webEnvironments: Record<string, EnvironmentOptions> = {};
  projectEntry.webEntries.forEach((entry, index) => {
    webEnvironments[`web${index}`] = {
      build: {
        rolldownOptions: {
          input: entry,
        },
      },
      consumer: "client",
    };
  });
  const builder = await createBuilder({
    root: config.root,
    configFile: false,
    plugins: [
      ...config.plugins,
      virtualHTML(config.webDir),
      exportBridge(projectEntry.serverEntry),
    ],
    environments: {
      ...webEnvironments,
      gas: {
        build: {
          lib: {
            formats: ["iife"],
            name: "GASApp",
            entry: projectEntry.serverEntry,
          },
        },
      },
    },
    build: {
      outDir: config.output.dir,
      assetsInlineLimit: () => true,
      cssCodeSplit: false,
      write: isWrite,
      emptyOutDir: false,
      reportCompressedSize: false,
    },
    logLevel: "silent",
  });
  const results = await Promise.all(
    Object.values(builder.environments).map((environment) => {
      if (environment.name !== "client") {
        if ((envFilter && envFilter.test(environment.name)) || !envFilter) {
          return builder.build(environment);
        }
      }
    }),
  );

  if (!isWrite) {
    const output: { web: Map<string, string>; server: string } = { web: new Map(), server: "" };
    (results.flat().filter((result) => result !== undefined) as RolldownOutput[]).map((result) => {
      const outputs = result.output.flat();
      outputs.forEach((out) => {
        if (out.type === "asset") {
          output.web.set(out.fileName, Buffer.from(out.source).toString("utf8"));
        } else {
          output.server = out.code;
        }
      });
    });
    return output;
  }
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
  const message = util.styleText("green", "building client environment for production...");
  const poweredBy = `${util.styleText("dim", "> powered by")} ${byVite}\n`;
  console.log(vegasId, message);
  console.log(poweredBy);
}

export async function runBuild(root?: string) {
  printBanner();

  const resolvedRoot = resolvePath(root);
  const userConfig = await loadConfig(resolvedRoot);
  const resolvedUserConfig = resolveConfig(userConfig);
  const projectSource = await collectSources(resolvedUserConfig);
  const projectEntry = detectEntries(projectSource);

  const startTime = performance.now();
  await buildApp(resolvedUserConfig, projectEntry, true);
  generateManifest(resolvedUserConfig);
  const endTime = performance.now();

  const artifacts = collectArtifacts(resolvedUserConfig.output.dir);
  artifacts.sort((a, b) => a.path.localeCompare(b.path));

  printReport(resolvedUserConfig, artifacts, endTime - startTime);
}
