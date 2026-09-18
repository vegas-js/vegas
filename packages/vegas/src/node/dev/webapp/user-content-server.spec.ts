import path from "node:path";

import { describe, expect, test } from "vitest";

import { createUserContentServerConfig } from "./user-content-server";

const fsRoot = path.parse(process.cwd()).root;
const root = path.join(fsRoot, "home", "user", "project");

describe("createUserContentServerConfig", () => {
  test("create user content Vite server config", () => {
    const config = createUserContentServerConfig({
      root,
      mode: "development",
      port: 5174,
      bridgeFilePath: path.join(root, "dist", "webapp-bridge.js"),
    });

    expect(config.root).toBe(root);
    expect(config.mode).toBe("development");
    expect(config.configFile).toBe(false);
    expect(config.server?.port).toBe(5174);
    expect(config.cacheDir).toBe(path.join(root, "node_modules", ".vegas-content"));
    expect(config.plugins).toHaveLength(1);
  });
});
