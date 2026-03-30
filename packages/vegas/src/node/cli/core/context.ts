import { ResolvedUserConfig } from "./config";

export interface ServeContext {
  config: ResolvedUserConfig;
  code: {
    client: { hrefs: string[]; map: Map<string, string> };
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
  sources: { client: Map<string, string>; server: string },
): ServeContext {
  return {
    config,
    code: {
      client: { hrefs: [], map: sources.client },
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
