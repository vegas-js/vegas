import path from "node:path";

import type { ViteDevServer } from "vite";
import { describe, expect, test } from "vitest";

import { createHostServerConfig } from "./host-server";

const fsRoot = path.parse(process.cwd()).root;
const root = path.join(fsRoot, "home", "user", "project");

function applyConfigFilePlugin(
  config: ReturnType<typeof createHostServerConfig>,
): string | undefined {
  const plugin = config.plugins?.[0];

  if (typeof plugin !== "object" || plugin === null) {
    throw new Error("Expected host config file plugin.");
  }

  const configureServer: unknown = Reflect.get(plugin, "configureServer");

  if (typeof configureServer !== "function") {
    throw new Error("Expected host config file plugin configureServer hook.");
  }

  const server = {
    config: {},
  } as ViteDevServer;

  configureServer(server);

  return server.config.configFile;
}

describe("createHostServerConfig", () => {
  test("create host Vite server config", () => {
    const configFile = path.join(root, "vegas.config.js");
    const config = createHostServerConfig({
      root,
      configFile,
      mode: "development",
      host: true,
      port: 4173,
      open: true,
    });

    expect(config.root).toBe(root);
    expect(config.mode).toBe("development");
    expect(config.configFile).toBe(false);
    expect(config.server).toMatchObject({
      host: true,
      port: 4173,
      open: true,
    });
    expect(config.cacheDir).toBe(path.join(root, "node_modules", ".vegas-host"));
    expect(config.plugins).toHaveLength(1);
    expect(applyConfigFilePlugin(config)).toBe(configFile);
  });

  test("omit the config file when the project uses defaults", () => {
    const config = createHostServerConfig({
      root,
      configFile: null,
      mode: "development",
      open: false,
    });

    expect(applyConfigFilePlugin(config)).toBeUndefined();
  });
});
