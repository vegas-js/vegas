import type { ArtifactStore, BuildArtifact } from "../build";

export interface DevBuildArtifacts {
  readonly clientArtifacts: readonly BuildArtifact[];
  readonly serverArtifacts: readonly BuildArtifact[];
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
