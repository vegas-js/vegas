import { describe, expect, test } from "vitest";

import { ArtifactStore } from "../build";
import type { ResolvedProject } from "../project";
import { buildRuntimeProgram, createRuntimeProgram } from "./runtime-program";

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

describe("createRuntimeProgram", () => {
  test("create a snapshot from the current server artifact", () => {
    const artifacts = new ArtifactStore();

    artifacts.replaceScope("server", [
      {
        path: "Code.js",
        content: "first",
      },
    ]);

    const first = createRuntimeProgram(artifacts);

    artifacts.replaceScope("server", [
      {
        path: "Code.js",
        content: "second",
      },
    ]);

    expect(first).toStrictEqual({
      source: "first",
      htmlFiles: {},
    });
    expect(createRuntimeProgram(artifacts)).toStrictEqual({
      source: "second",
      htmlFiles: {},
    });
  });

  test("create a snapshot from current client HTML artifacts including nested paths", () => {
    const artifacts = new ArtifactStore();

    artifacts.replaceScopes([
      {
        scope: "client",
        artifacts: [
          {
            path: "index.html",
            content: "index:first",
          },
          {
            path: "admin/index.html",
            content: "admin:first",
          },
          {
            path: "assets/app.js",
            content: "client:first",
          },
        ],
      },
      {
        scope: "server",
        artifacts: [
          {
            path: "Code.js",
            content: "server",
          },
        ],
      },
    ]);

    const first = createRuntimeProgram(artifacts);

    artifacts.replaceScope("client", [
      {
        path: "index.html",
        content: "index:second",
      },
      {
        path: "assets/app.js",
        content: "client:second",
      },
    ]);

    expect(first.htmlFiles).toStrictEqual({
      "index.html": "index:first",
      "admin/index.html": "admin:first",
    });
    expect(createRuntimeProgram(artifacts).htmlFiles).toStrictEqual({
      "index.html": "index:second",
    });
  });
});

describe("buildRuntimeProgram", () => {
  test("build a runtime program from project build artifacts", async () => {
    const calls: Array<{
      readonly project: ResolvedProject;
      readonly mode: "development" | "production";
    }> = [];

    const program = await buildRuntimeProgram(project, "development", async (received, mode) => {
      calls.push({
        project: received,
        mode,
      });

      return {
        clientArtifacts: [
          {
            path: "index.html",
            content: "client",
          },
          {
            path: "assets/app.js",
            content: "ignored",
          },
        ],
        serverArtifacts: [
          {
            path: "Code.js",
            content: "server",
          },
        ],
      };
    });

    expect(calls).toStrictEqual([
      {
        project,
        mode: "development",
      },
    ]);
    expect(program).toStrictEqual({
      source: "server",
      htmlFiles: {
        "index.html": "client",
      },
    });
  });
});
