import type { ViteBuilder } from "vite";

import { type ArtifactStore, buildApp } from "../build";
import type { ResolvedProject } from "../project";
import { buildDevTopology } from "./build-topology";
import type { ProjectFileScope } from "./project-file";

interface DevBuildManagerOptions {
  readonly project: ResolvedProject;
  readonly artifacts: ArtifactStore;
  readonly builder: ViteBuilder;
  readonly mode: "development" | "production";
}

interface DevBuildManagerDependencies {
  readonly buildApp?: typeof buildApp;
  readonly buildDevTopology?: typeof buildDevTopology;
}

export class DevBuildManager {
  readonly #project: ResolvedProject;
  readonly #artifacts: ArtifactStore;
  readonly #mode: "development" | "production";
  readonly #buildApp: typeof buildApp;
  readonly #buildDevTopology: typeof buildDevTopology;
  #builder: ViteBuilder;

  constructor(options: DevBuildManagerOptions, dependencies: DevBuildManagerDependencies = {}) {
    this.#project = options.project;
    this.#artifacts = options.artifacts;
    this.#builder = options.builder;
    this.#mode = options.mode;
    this.#buildApp = dependencies.buildApp ?? buildApp;
    this.#buildDevTopology = dependencies.buildDevTopology ?? buildDevTopology;
  }

  async rebuild(scope: ProjectFileScope): Promise<void> {
    if (scope === "client") {
      const [clientArtifacts, serverArtifacts] = await Promise.all([
        this.#buildApp(this.#builder, /^client\d+$/),
        this.#buildApp(this.#builder, /^server$/),
      ]);

      this.#artifacts.replaceScopes([
        {
          scope: "client",
          artifacts: clientArtifacts,
        },
        {
          scope: "server",
          artifacts: serverArtifacts,
        },
      ]);

      return;
    }

    const artifacts = await this.#buildApp(this.#builder, /^server$/);
    this.#artifacts.replaceScope("server", artifacts);
  }

  async refreshTopology(): Promise<void> {
    const next = await this.#buildDevTopology(this.#project, this.#mode);

    this.#artifacts.replaceScopes([
      {
        scope: "client",
        artifacts: next.clientArtifacts,
      },
      {
        scope: "server",
        artifacts: next.serverArtifacts,
      },
    ]);

    this.#builder = next.builder;
  }
}
