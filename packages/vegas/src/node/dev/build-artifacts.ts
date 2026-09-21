import type { ViteBuilder } from "vite";

import {
  CLIENT_ENVIRONMENT_PATTERN,
  SERVER_ENVIRONMENT_PATTERN,
  type ArtifactStore,
  type BuildArtifact,
  buildApp,
} from "../build";

export interface DevBuildArtifacts {
  readonly clientArtifacts: readonly BuildArtifact[];
  readonly serverArtifacts: readonly BuildArtifact[];
}

export async function buildDevArtifacts(
  builder: ViteBuilder,
  build: typeof buildApp = buildApp,
): Promise<DevBuildArtifacts> {
  const [clientArtifacts, serverArtifacts] = await Promise.all([
    build(builder, CLIENT_ENVIRONMENT_PATTERN),
    build(builder, SERVER_ENVIRONMENT_PATTERN),
  ]);

  return {
    clientArtifacts,
    serverArtifacts,
  };
}

export function replaceDevBuildArtifacts(store: ArtifactStore, artifacts: DevBuildArtifacts): void {
  store.replaceScopes([
    {
      scope: "client",
      artifacts: artifacts.clientArtifacts,
    },
    {
      scope: "server",
      artifacts: artifacts.serverArtifacts,
    },
  ]);
}
