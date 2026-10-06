import path from "node:path";

import { createLogger, type InlineConfig } from "vite";

interface UserContentServerConfigOptions {
  readonly root: string;
  readonly mode: "development" | "production";
  readonly host?: string | boolean;
  readonly port: number;
  readonly bridgeFilePath: string;
}

export function createUserContentServerConfig(
  options: UserContentServerConfigOptions,
): InlineConfig {
  return {
    root: options.root,
    mode: options.mode,
    configFile: false,
    plugins: [
      {
        name: "vegas",

        resolveId(source, _importer, _options) {
          if (source === "/@vegas/client") {
            return "\0virtual:vegas";
          }
        },

        async load(id, _options) {
          if (id === "\0virtual:vegas") {
            return await this.fs.readFile(options.bridgeFilePath, {
              encoding: "utf8",
            });
          }
        },
      },
    ],
    server: { host: options.host, port: options.port },
    customLogger: createLogger("info", { prefix: "[vegas]" }),
    cacheDir: path.join(options.root, "node_modules", ".vegas-content"),
  };
}
