import path from "node:path";

import { createLogger, type InlineConfig } from "vite";

interface HostServerConfigOptions {
  readonly root: string;
  readonly configFile: string | null;
  readonly mode: "development" | "production";
  readonly host?: string | boolean;
  readonly port?: number;
  readonly open: boolean;
}

export function createHostServerConfig(options: HostServerConfigOptions): InlineConfig {
  return {
    root: options.root,
    mode: options.mode,
    configFile: false,
    customLogger: createLogger("info", { prefix: "[vegas]" }),
    cacheDir: path.join(options.root, "node_modules", ".vegas-host"),
    plugins: [
      {
        name: "vite-plugin-configfile",
        configureServer(server) {
          Object.assign(server.config, {
            configFile: options.configFile ?? undefined,
          });
        },
      },
    ],
    server: {
      host: options.host,
      port: options.port,
      open: options.open,
    },
  };
}
