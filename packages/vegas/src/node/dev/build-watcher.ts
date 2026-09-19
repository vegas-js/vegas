import { stripVTControlCharacters } from "node:util";

import type { ViteDevServer } from "vite";

import type { ResolvedProject } from "../project";
import type { BuildCoordinator } from "./build-coordinator";
import type { DevBuildManager } from "./build-manager";
import { classifyProjectFile } from "./project-file";

interface BuildWatcherOptions {
  readonly server: ViteDevServer;
  readonly project: ResolvedProject;
  readonly builds: BuildCoordinator;
  readonly buildManager: Pick<DevBuildManager, "rebuild" | "refreshTopology">;
}

function normalizeBuildError(error: unknown): { message: string; stack: string } {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error && error.stack !== undefined ? error.stack : message;

  return {
    message: stripVTControlCharacters(message),
    stack: stripVTControlCharacters(stack),
  };
}

function reportBuildError(server: ViteDevServer, error: unknown): void {
  console.error(error);

  server.ws.send({
    type: "error",
    err: normalizeBuildError(error),
  });
}

export function registerBuildWatchers(options: BuildWatcherOptions): void {
  const { server, project, builds, buildManager } = options;

  const runBuild = async (task: () => Promise<void>): Promise<void> => {
    try {
      await builds.run(task);
    } catch (error) {
      reportBuildError(server, error);
    }
  };

  server.watcher.add([project.clientDir, project.serverDir]);

  server.watcher.on("change", async (filePath) => {
    const scope = classifyProjectFile(project, filePath);

    if (!scope) {
      return;
    }

    await runBuild(async () => {
      await buildManager.rebuild(scope);

      if (scope === "client") {
        server.moduleGraph.invalidateAll();
        server.ws.send({ type: "full-reload" });
      }
    });
  });

  const handleTopologyChange = async (filePath: string): Promise<void> => {
    const scope = classifyProjectFile(project, filePath);

    if (!scope) {
      return;
    }

    await runBuild(async () => {
      await buildManager.refreshTopology();

      server.moduleGraph.invalidateAll();
      server.ws.send({ type: "full-reload" });
    });
  };

  server.watcher.on("add", handleTopologyChange);
  server.watcher.on("unlink", handleTopologyChange);
}
