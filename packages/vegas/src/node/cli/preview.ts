import path from "node:path";

import vfs from "@platformatic/vfs";
import { createBuilder } from "vite";

import { collectSources, detectClientEntries } from "./core/analyze";
import { buildApp, createBuilderConfig } from "./core/build";
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
  );
  const builder = await createBuilder(builderConfig);
  using mvfs = vfs.create();
  await buildApp(mvfs, builder);
  const ctx = createServeContext(resolvedUserConfig, mvfs);
  await loadMock(ctx, projectSource.gasMockSources);

  await serveApp(ctx, builder);
}
