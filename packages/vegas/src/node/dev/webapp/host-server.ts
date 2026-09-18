import path from "node:path";

import { createLogger, type InlineConfig } from "vite";

interface HostServerConfigOptions {
  readonly root: string;
  readonly mode: "development" | "production";
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
          Object.assign(server.config, { configFile: "vegas.config.ts" });
        },
      },
    ],
    server: {
      open: false,
    },
  };
}
