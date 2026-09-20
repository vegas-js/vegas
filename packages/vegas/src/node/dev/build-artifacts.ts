import type { ViteBuilder } from "vite";

import { type ArtifactStore, type BuildArtifact, buildApp } from "../build";

export interface DevBuildArtifacts {
  readonly clientArtifacts: readonly BuildArtifact[];
  readonly serverArtifacts: readonly BuildArtifact[];
}

export async function buildDevArtifacts(
  builder: ViteBuilder,
  build: typeof buildApp = buildApp,
): Promise<DevBuildArtifacts> {
  const [clientArtifacts, serverArtifacts] = await Promise.all([
    build(builder, /^client\d+$/),
    build(builder, /^server$/),
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
