import path from "node:path";

import { createBuilder } from "vite";

import { collectSources, detectClientEntries } from "./core/analyze";
import { buildApp, createBuilderConfig, extractOutput } from "./core/build";
import { loadConfig, resolveConfig } from "./core/config";
import { createServeContext } from "./core/context";
import { loadMock } from "./core/mock";
import { serveApp } from "./core/serve";

export async function runPreview(root?: string) {
  const resolvedRoot = path.resolve(root ?? ".");
  const userConfig = await loadConfig(resolvedRoot);
  const resolvedUserConfig = resolveConfig(userConfig);
  const projectSource = await collectSources(resolvedUserConfig);
  const clientEntries =
    resolvedUserConfig.appType === "spa" ? detectClientEntries(projectSource.clientSources) : [];

  const builderConfig = createBuilderConfig(
    resolvedUserConfig,
    "production",
    projectSource,
    clientEntries,
    false,
  );
  const builder = await createBuilder(builderConfig);
  const result = await buildApp(builder);
  const sources = extractOutput(result);
  const ctx = createServeContext(resolvedUserConfig, sources);
  await loadMock(ctx, projectSource.gasMockSources);

  await serveApp(ctx, builder);
}
