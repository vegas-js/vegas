import path from "node:path";

import { describe, expect, test } from "vitest";

import type { BuildPlan } from "../plan";
import { createBuilderConfig } from "./config";

const fsRoot = path.parse(process.cwd()).root;
const root = path.join(fsRoot, "home", "user", "project");

function createPlan(mode: "development" | "production"): BuildPlan {
  return {
    root,
    outputDir: path.join(root, "dist"),
    clientDir: path.join(root, "src", "client"),
    appType: "spa",
    mode,
    plugins: [],
    clientEntries: [],
    clientSources: [],
    serverSources: [],
  };
}

describe("createBuilderConfig", () => {
  test("set vite mode from build plan", () => {
    const config = createBuilderConfig(createPlan("development"));

    expect(config.mode).toBe("development");
  });
});
