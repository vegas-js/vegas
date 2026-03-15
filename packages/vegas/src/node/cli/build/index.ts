import fs from "node:fs";
import path from "node:path";
import util from "node:util";

import {
  createBuilder,
  EnvironmentOptions,
  InlineConfig,
  Rolldown,
  version as VITE_VERSION,
  ViteBuilder,
} from "vite";

import { version as VEGAS_VERSION } from "../../../../package.json";
import { collectSources, detectEntries, ProjectEntry } from "../core/analyze";
import { loadConfig, resolveConfig, ResolvedUserConfig } from "../core/config";
import { exportBridge } from "./plugins/exportbridge";
import { virtualHTML } from "./plugins/virtualhtml";
import { collectArtifacts, printReport } from "./printReport";

export async function buildApp(builder: ViteBuilder, envFilter?: RegExp) {
  const buildPromises = [];
  for (const environment of Object.values(builder.environments)) {
    if (environment.name === "client") {
      continue;
    }
    if (!envFilter || envFilter.test(environment.name)) {
      buildPromises.push(builder.build(environment));
    }
  }
  return Promise.all(buildPromises);
}

export function createBuilderConfig(
  config: ResolvedUserConfig,
  projectEntry: ProjectEntry,
  isWrite: boolean = true,
) {
  const environments: Record<string, EnvironmentOptions> = {
    gas: {
      build: {
        lib: {
          formats: ["iife"],
          name: "GASApp",
          entry: projectEntry.serverEntry,
        },
      },
    },
  };
  projectEntry.webEntries.forEach((entry, index) => {
    environments[`web${index}`] = {
      consumer: "client",
      build: {
        rolldownOptions: {
          input: entry,
        },
      },
    };
  });
  const builderConfig: InlineConfig = {
    root: config.root,
    configFile: false,
    plugins: [
      ...config.plugins,
      virtualHTML(config.webDir),
      exportBridge(projectEntry.serverEntry),
    ],
    environments,
    build: {
      outDir: config.output.dir,
      assetsInlineLimit: () => true,
      cssCodeSplit: false,
      write: isWrite,
      emptyOutDir: false,
      reportCompressedSize: false,
    },
    logLevel: "silent",
  };
  return builderConfig;
}

export function extractOutput(
  results: (Rolldown.RolldownOutput | Rolldown.RolldownOutput[] | Rolldown.RolldownWatcher)[],
) {
  const output: { web: Map<string, string>; server: string } = { web: new Map(), server: "" };
  (results.flat() as Rolldown.RolldownOutput[]).map((result) => {
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

  const resolvedRoot = path.resolve(root ?? ".");
  const userConfig = await loadConfig(resolvedRoot);
  const resolvedUserConfig = resolveConfig(userConfig);
  const projectSource = await collectSources(resolvedUserConfig);
  const projectEntry = detectEntries(projectSource);

  const startTime = performance.now();
  const builderConfig = createBuilderConfig(resolvedUserConfig, projectEntry);
  const builder = await createBuilder(builderConfig);
  fs.rmSync(resolvedUserConfig.output.dir, { recursive: true, force: true });
  await buildApp(builder);
  generateManifest(resolvedUserConfig);
  const endTime = performance.now();

  const artifacts = collectArtifacts(resolvedUserConfig.output.dir);
  artifacts.sort((a, b) => a.path.localeCompare(b.path));

  printReport(resolvedUserConfig, artifacts, endTime - startTime);
}
