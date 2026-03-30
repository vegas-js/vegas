import fs from "node:fs";
import path from "node:path";

import { createBuilder } from "vite";

import { collectSources, detectClientEntries, isWebApp } from "./core/analyze";
import { buildApp, createBuilderConfig, extractOutput, printBanner } from "./core/build";
import { loadConfig, resolveConfig } from "./core/config";
import { generateGASManifest } from "./core/manifest";
import { collectArtifacts, printReport } from "./core/printReport";

export async function runBuild(root?: string) {
  printBanner();

  const resolvedRoot = path.resolve(root ?? ".");
  const userConfig = await loadConfig(resolvedRoot);
  const resolvedUserConfig = resolveConfig(userConfig);
  const projectSource = await collectSources(resolvedUserConfig);
  const clientEntries =
    resolvedUserConfig.appType === "spa" ? detectClientEntries(projectSource.clientSources) : [];

  const startTime = performance.now();
  const builderConfig = createBuilderConfig(
    resolvedUserConfig,
    "production",
    projectSource,
    clientEntries,
  );
  const builder = await createBuilder(builderConfig);
  fs.rmSync(resolvedUserConfig.output.dir, { recursive: true, force: true });
  const result = await buildApp(builder);
  const { server } = extractOutput(result);
  if (!isWebApp(server)) {
    resolvedUserConfig.gas.webapp = undefined;
  }
  generateGASManifest(resolvedUserConfig.output.dir, resolvedUserConfig.gas);
  const endTime = performance.now();

  const artifacts = collectArtifacts(resolvedUserConfig.output.dir);
  artifacts.sort((a, b) => a.path.localeCompare(b.path));

  printReport(resolvedUserConfig, artifacts, endTime - startTime);
}
