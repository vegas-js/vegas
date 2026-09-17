import type { ArtifactStore } from "../../build";
import type { ResolvedProject } from "../../project";

export interface ServeContext {
  project: ResolvedProject;
  artifacts: ArtifactStore;
  mock: Record<string, any>;
  store: {
    cache: {
      document: Record<string, { value: string; expired: number }>;
      script: Record<string, { value: string; expired: number }>;
      user: Record<string, { value: string; expired: number }>;
    };
    spreadsheet: Map<
      string,
      { name: string; sheets: Map<number, { name: string; cells: any[][] }> }
    >;
  };
}

export function createServeContext(
  project: ResolvedProject,
  artifacts: ArtifactStore,
): ServeContext {
  return {
    project,
    artifacts,
    mock: {},
    store: {
      cache: {
        document: {},
        script: {},
        user: {},
      },
      spreadsheet: new Map(),
    },
  };
}
