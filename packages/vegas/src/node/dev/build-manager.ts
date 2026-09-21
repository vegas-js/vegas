import type { ViteBuilder } from "vite";

import { SERVER_ENVIRONMENT_PATTERN, type ArtifactStore, buildApp } from "../build";
import type { ResolvedProject } from "../project";
import { buildDevArtifacts, replaceDevBuildArtifacts } from "./build-artifacts";
import { buildDevTopology } from "./build-topology";
import type { ProjectBuildScope } from "./project-file";

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

  async rebuild(scope: ProjectBuildScope): Promise<void> {
    if (scope === "client") {
      const artifacts = await buildDevArtifacts(this.#builder, this.#buildApp);
      replaceDevBuildArtifacts(this.#artifacts, artifacts);
      return;
    }

    const artifacts = await this.#buildApp(this.#builder, SERVER_ENVIRONMENT_PATTERN);
    this.#artifacts.replaceScope("server", artifacts);
  }

  async refreshTopology(): Promise<void> {
    const next = await this.#buildDevTopology(this.#project, this.#mode);

    replaceDevBuildArtifacts(this.#artifacts, next);

    this.#builder = next.builder;
  }
}
