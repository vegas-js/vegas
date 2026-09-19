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

// oxlint-disable-next-line no-control-regex
const ANSI_ESCAPE_PATTERN = /\x1b\[[\d;]+m/g;

function stripAnsi(value: string): string {
  return value.replace(ANSI_ESCAPE_PATTERN, "");
}

function normalizeBuildError(error: unknown): { message: string; stack: string } {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error && error.stack !== undefined ? error.stack : message;

  return {
    message: stripAnsi(message),
    stack: stripAnsi(stack),
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

  server.watcher.add([project.clientDir, project.serverDir]);

  server.watcher.on("change", async (filePath) => {
    const scope = classifyProjectFile(project, filePath);

    if (!scope) {
      return;
    }

    try {
      await builds.run(async () => {
        await buildManager.rebuild(scope);

        if (scope === "client") {
          server.moduleGraph.invalidateAll();
          server.ws.send({ type: "full-reload" });
        }
      });
    } catch (error) {
      reportBuildError(server, error);
    }
  });

  const handleTopologyChange = async (filePath: string): Promise<void> => {
    const scope = classifyProjectFile(project, filePath);

    if (!scope) {
      return;
    }

    try {
      await builds.run(async () => {
        await buildManager.refreshTopology();

        server.moduleGraph.invalidateAll();
        server.ws.send({ type: "full-reload" });
      });
    } catch (error) {
      reportBuildError(server, error);
    }
  };

  server.watcher.on("add", handleTopologyChange);
  server.watcher.on("unlink", handleTopologyChange);
}
