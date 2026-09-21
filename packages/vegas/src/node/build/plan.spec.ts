import path from "node:path";

import { describe, expect, test } from "vitest";

import type { ProjectSnapshot, ResolvedProject } from "../project";
import { createBuildPlan } from "./plan";

const fsRoot = path.parse(process.cwd()).root;
const cwd = path.join(fsRoot, "home", "user");
const projectRoot = path.join(cwd, "project");

const project: ResolvedProject = {
  root: projectRoot,
  configFile: null,
  clientDir: path.join(projectRoot, "src", "client"),
  serverDir: path.join(projectRoot, "src", "server"),
  runtimeDataDir: path.join(projectRoot, "runtime"),
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

describe("createBuildPlan", () => {
  test("create build plan", () => {
    const clientModuleEntry = {
      id: "index",
      sourcePath: path.join(project.clientDir, "main.tsx"),
      htmlPath: "index.html",
    };
    const clientHtmlEntry = {
      sourcePath: path.join(project.clientDir, "about.html"),
      htmlPath: "about.html",
    };

    const snapshot: ProjectSnapshot = {
      clientModuleEntries: [clientModuleEntry],
      clientHtmlEntries: [clientHtmlEntry],
      clientSources: [clientModuleEntry.sourcePath],
      serverSources: [],
      runtimeDataSources: [],
    };

    const plan = createBuildPlan(project, snapshot, "production");

    expect(plan).toStrictEqual({
      root: project.root,
      outputDir: project.outputDir,
      appType: "spa",
      mode: "production",
      plugins: project.plugins,
      clientModuleTargets: [
        {
          sourcePath: clientModuleEntry.sourcePath,
          htmlPath: clientModuleEntry.htmlPath,
        },
      ],
      clientHtmlTargets: [
        {
          sourcePath: clientHtmlEntry.sourcePath,
          htmlPath: clientHtmlEntry.htmlPath,
        },
      ],
      clientSources: snapshot.clientSources,
      serverSources: snapshot.serverSources,
    });
  });

  test("reject duplicate client HTML output paths", () => {
    const sourcePath = path.join(project.clientDir, "main.ts");
    const snapshot: ProjectSnapshot = {
      clientSources: [sourcePath],
      serverSources: [],
      runtimeDataSources: [],
      clientModuleEntries: [
        {
          id: "index",
          sourcePath,
          htmlPath: "index.html",
        },
      ],
      clientHtmlEntries: [
        {
          sourcePath: path.join(project.clientDir, "index.html"),
          htmlPath: "index.html",
        },
      ],
    };

    expect(() => createBuildPlan(project, snapshot, "production")).toThrow(
      "Duplicate client HTML output: index.html",
    );
  });
});
