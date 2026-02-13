import { join } from "node:path";
import { createLogger, createServer } from "vite";

import {
  collectSources,
  detectEntries,
  mappingProjectIO,
  ProjectEntry,
  ProjectIOMap,
} from "../analyze";
import { loadConfig, resolveConfig, ResolvedUserConfig } from "../config";
import { resolvePath } from "../path";
import { vegasServe } from "./plugins/vegasserve";

async function serveApp(
  config: ResolvedUserConfig,
  projectEntry: ProjectEntry,
  projectIOMap: ProjectIOMap[],
) {
  const server = await createServer({
    root: config.root,
    configFile: false,
    plugins: [...config.plugins, vegasServe(projectEntry, projectIOMap)],
    customLogger: createLogger("info", { prefix: "[vegas]" }),
    cacheDir: join(config.root, "node_modules", ".vegas"),
  });

  await server.listen();
  server.printUrls();
  server.bindCLIShortcuts({ print: true });
}

export async function runServe(root?: string) {
  const resolvedRoot = resolvePath(root);
  const userConfig = await loadConfig(resolvedRoot);
  const resolvedUserConfig = resolveConfig(userConfig);
  const projectSource = collectSources(resolvedUserConfig);
  const projectEntry = detectEntries(projectSource);
  const projectIOMap = mappingProjectIO(resolvedUserConfig, projectEntry);

  await serveApp(resolvedUserConfig, projectEntry, projectIOMap);
}
