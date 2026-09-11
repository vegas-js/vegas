import vfs from "@platformatic/vfs";

import { ResolvedUserConfig } from "./config";

export interface ServeContext {
  config: ResolvedUserConfig;
  vfs: vfs.VirtualFileSystem;
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
  vfs: vfs.VirtualFileSystem,
): ServeContext {
  return {
    config,
    vfs,
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
