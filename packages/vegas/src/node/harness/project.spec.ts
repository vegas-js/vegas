import { describe, expect, test, vi } from "vitest";

import type { ResolvedProject } from "../project";
import type { Program } from "../runtime";
import { loadHarnessProjectWithDependencies } from "./project";

const project = {
  root: "/project",
  configFile: null,
  clientDir: "/project/src/client",
  serverDir: "/project/src/server",
  runtimeDataDir: "/project/runtime",
  outputDir: "/project/dist",
  appType: "script",
  plugins: [],
  devServer: { open: false },
  appsScript: {
    serverFunctions: {
      backend: "local",
    },
    manifest: {
      exceptionLogging: "STACKDRIVER",
      runtimeVersion: "V8",
      timeZone: "UTC",
      webapp: {
        access: "MYSELF",
        executeAs: "USER_ACCESSING",
      },
    },
  },
} satisfies ResolvedProject;

const program = {
  source: "function main() { return 'ok'; }",
  htmlFiles: {},
} satisfies Program;

describe("loadHarnessProjectWithDependencies", () => {
  test("load the project and build its development Runtime program", async () => {
    const loadProject = vi.fn(async () => project);
    const buildRuntimeProgram = vi.fn(async () => program);

    await expect(
      loadHarnessProjectWithDependencies(
        {
          root: "./fixture",
        },
        {
          cwd: "/workspace",
          loadProject,
          buildRuntimeProgram,
        },
      ),
    ).resolves.toStrictEqual({
      project,
      program,
    });

    expect(loadProject).toHaveBeenCalledWith({
      cwd: "/workspace",
      root: "./fixture",
    });
    expect(buildRuntimeProgram).toHaveBeenCalledWith(project, "development");
  });
});
