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

function reportBuildError(server: ViteDevServer, err: any): void {
  console.error(err);

  server.ws.send({
    type: "error",
    err: {
      // oxlint-disable-next-line no-control-regex
      message: err.message.replace(/\x1b\[[\d;]+m/g, ""),
      // oxlint-disable-next-line no-control-regex
      stack: err.stack.replace(/\x1b\[[\d;]+m/g, ""),
    },
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
    } catch (err: any) {
      reportBuildError(server, err);
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
    } catch (err: any) {
      reportBuildError(server, err);
    }
  };

  server.watcher.on("add", handleTopologyChange);
  server.watcher.on("unlink", handleTopologyChange);
}
