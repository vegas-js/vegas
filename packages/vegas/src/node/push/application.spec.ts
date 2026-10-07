import { describe, expect, test, vi } from "vitest";

import type { ResolvedProject } from "../project";
import { runPushApplicationWithDependencies } from "./application";

const project: ResolvedProject = {
  root: "/project",
  configFile: null,
  clientDir: "/project/src/client",
  serverDir: "/project/src/server",
  runtimeDataDir: "/project/runtime",
  outputDir: "/project/dist",
  appType: "spa",
  plugins: [],
  devServer: { open: false },
  appsScript: {
    scriptId: "script-id",
    serverFunctions: {
      backend: "local",
    },
    manifest: {},
  },
};

describe("runPushApplicationWithDependencies", () => {
  test("resolve the project and push its build output", async () => {
    const loadProject = vi.fn(async () => project);
    const pushAppsScriptProject = vi.fn(async () => {});

    await runPushApplicationWithDependencies(
      "/workspace/project",
      { profile: "work" },
      {
        cwd: "/workspace",
        loadProject,
        pushAppsScriptProject,
      },
    );

    expect(loadProject).toHaveBeenCalledOnce();
    expect(loadProject).toHaveBeenCalledWith({
      cwd: "/workspace",
      root: "/workspace/project",
    });
    expect(pushAppsScriptProject).toHaveBeenCalledOnce();
    expect(pushAppsScriptProject).toHaveBeenCalledWith({
      projectRoot: "/project",
      outputDir: "/project/dist",
      projectScriptId: "script-id",
      profile: "work",
    });
  });
});
