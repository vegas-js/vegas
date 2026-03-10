import { ProjectEntry } from "../core/analyze";
import { ResolvedUserConfig } from "../core/config";

export interface ServeContext {
  config: ResolvedUserConfig;
  entry: ProjectEntry;
  code: {
    web: { hrefs: string[]; map: Map<string, string> };
    server: string;
  };
  mock: Record<string, any>;
  store: {
    properties: {
      document: Record<string, string>;
      script: Record<string, string>;
      user: Record<string, string>;
    };
    cache: {
      document: Record<string, { value: string; expired: number }>;
      script: Record<string, { value: string; expired: number }>;
      user: Record<string, { value: string; expired: number }>;
    };
    spreadsheet: Map<
      string,
      { name: string; sheet: Map<number, { name: string; cells: any[][] }> }
    >;
  };
}

export function createServeContext(
  config: ResolvedUserConfig,
  projectEntry: ProjectEntry,
): ServeContext {
  return {
    config,
    entry: projectEntry,
    code: {
      web: { hrefs: [], map: new Map() },
      server: "",
    },
    mock: {},
    store: {
      properties: {
        document: {},
        script: {},
        user: {},
      },
      cache: {
        document: {},
        script: {},
        user: {},
      },
      spreadsheet: new Map(),
    },
  };
}
