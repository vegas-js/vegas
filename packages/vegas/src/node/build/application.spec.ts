import { describe, expect, test } from "vitest";

import type { ProjectSnapshot, ResolvedProject } from "../project";
import { runBuildApplicationWithDependencies } from "./application";
import type { BuildArtifact } from "./artifact";

const project = {
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

const snapshot = {
  clientSources: [],
  serverSources: [],
  runtimeDataSources: [],
  clientModuleEntries: [],
  clientHtmlEntries: [],
} satisfies ProjectSnapshot;

describe("runBuildApplicationWithDependencies", () => {
  test("orchestrate project loading, build, output replacement, and build timing", async () => {
    const artifacts: BuildArtifact[] = [
      {
        path: "Code.js",
        content: "server",
      },
    ];
    const events: string[] = [];
    const times = [100, 175];

    const result = await runBuildApplicationWithDependencies("/workspace/project", {
      cwd: "/workspace",
      now: () => {
        events.push("now");
        const value = times.shift();

        if (value === undefined) {
          throw new Error("unexpected timing call");
        }

        return value;
      },
      loadProject: async (options) => {
        events.push("load");
        expect(options).toStrictEqual({
          cwd: "/workspace",
          root: "/workspace/project",
        });

        return project;
      },
      scanProject: async (receivedProject) => {
        events.push("scan");
        expect(receivedProject).toBe(project);

        return snapshot;
      },
      buildProjectArtifacts: async (receivedProject, receivedSnapshot) => {
        events.push("build");
        expect(receivedProject).toBe(project);
        expect(receivedSnapshot).toBe(snapshot);

        return artifacts;
      },
      replaceOutputArtifacts: async (outputDir, receivedArtifacts) => {
        events.push("write");
        expect(outputDir).toBe(project.outputDir);
        expect(receivedArtifacts).toBe(artifacts);
      },
    });

    expect(events).toStrictEqual(["load", "scan", "now", "build", "write", "now"]);
    expect(result).toStrictEqual({
      project,
      artifacts,
      durationMs: 75,
    });
  });
});
