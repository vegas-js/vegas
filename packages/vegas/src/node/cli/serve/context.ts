import { ResolvedUserConfig } from "../core/config";

export interface ServeContext {
  config: ResolvedUserConfig;
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
      { name: string; sheets: Map<number, { name: string; cells: any[][] }> }
    >;
  };
}

export function createServeContext(
  config: ResolvedUserConfig,
  sources: { web: Map<string, string>; server: string },
): ServeContext {
  return {
    config,
    code: {
      web: { hrefs: [], map: sources.web },
      server: sources.server,
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
