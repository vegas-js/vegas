import { join } from "node:path";

import { createLogger, createServer } from "vite";

import { collectSources, detectEntries, ProjectEntry } from "../analyze";
import { loadConfig, resolveConfig, ResolvedUserConfig } from "../config";
import { resolvePath } from "../path";
import { hostFrame } from "./plugins/hostframe";
import { userContentFrame } from "./plugins/usercontentframe";

async function serveApp(
  config: ResolvedUserConfig,
  projectEntry: ProjectEntry,
  gasMockSources: string[],
) {
  const hostServer = await createServer({
    root: config.root,
    configFile: false,
    plugins: [hostFrame(config, projectEntry, gasMockSources)],
    customLogger: createLogger("info", { prefix: "[vegas]" }),
    cacheDir: join(config.root, "node_modules", ".vegas-host"),
  });
  await hostServer.listen();

  const contentServer = await createServer({
    root: config.root,
    configFile: false,
    plugins: [...config.plugins, userContentFrame()],
    server: { port: hostServer.config.server.port + 1 },
    customLogger: createLogger("info", { prefix: "[vegas]" }),
    cacheDir: join(config.root, "node_modules", ".vegas-content"),
  });
  await contentServer.listen();

  hostServer.printUrls();
  hostServer.bindCLIShortcuts({ print: true });
}

export async function runServe(root?: string) {
  const resolvedRoot = resolvePath(root);
  const userConfig = await loadConfig(resolvedRoot);
  const resolvedUserConfig = resolveConfig(userConfig);
  const projectSource = collectSources(resolvedUserConfig);
  const projectEntry = detectEntries(projectSource);

  await serveApp(resolvedUserConfig, projectEntry, projectSource.gasMockSources);
}
