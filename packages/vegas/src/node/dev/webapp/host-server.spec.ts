import path from "node:path";

import { describe, expect, test } from "vitest";

import { createHostServerConfig } from "./host-server";

const fsRoot = path.parse(process.cwd()).root;
const root = path.join(fsRoot, "home", "user", "project");

describe("createHostServerConfig", () => {
  test("create host Vite server config", () => {
    const config = createHostServerConfig({
      root,
      mode: "development",
    });

    expect(config.root).toBe(root);
    expect(config.mode).toBe("development");
    expect(config.configFile).toBe(false);
    expect(config.server?.open).toBe(false);
    expect(config.cacheDir).toBe(path.join(root, "node_modules", ".vegas-host"));
    expect(config.plugins).toHaveLength(1);
  });
});
