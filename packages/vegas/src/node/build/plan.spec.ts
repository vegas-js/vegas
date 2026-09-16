import path from "node:path";

import { describe, expect, test } from "vitest";

import type { ProjectSnapshot, ResolvedProject } from "../project";
import { createBuildPlan } from "./plan";

const fsRoot = path.parse(process.cwd()).root;
const cwd = path.join(fsRoot, "home", "user");
const projectRoot = path.join(cwd, "project");

describe("createBuildPlan", () => {
  test("create build plan", () => {
    const project: ResolvedProject = {
      root: projectRoot,
      configFile: null,
      clientDir: path.join(projectRoot, "src", "client"),
      serverDir: path.join(projectRoot, "src", "server"),
      gasMockDir: path.join(projectRoot, "mock"),
      outputDir: path.join(projectRoot, "dist"),
      appType: "spa",
      plugins: [],

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
    };

    const clientEntry = {
      id: "index",
      sourcePath: path.join(project.clientDir, "main.tsx"),
      htmlPath: "index.html",
    };

    const snapshot: ProjectSnapshot = {
      clientEntries: [clientEntry],
      clientSources: [clientEntry.sourcePath],
      serverSources: [],
      gasMockSources: [],
    };

    const plan = createBuildPlan(project, snapshot, "production");

    expect(plan).toStrictEqual({
      root: project.root,
      outputDir: project.outputDir,
      appType: "spa",
      mode: "production",
      plugins: project.plugins,
      clientEntries: snapshot.clientEntries,
      clientSources: snapshot.clientSources,
      serverSources: snapshot.serverSources,
    });
  });
});
