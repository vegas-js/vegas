import path from "node:path";

import { describe, expect, test } from "vitest";

import type { ResolvedProject } from "../project";
import { classifyProjectFile } from "./project-file";

function createProject(root: string, appType: "spa" | "script" = "spa"): ResolvedProject {
  return {
    root,
    configFile: null,
    clientDir: path.join(root, "src", "client"),
    serverDir: path.join(root, "src", "server"),
    gasMockDir: path.join(root, "mock"),
    outputDir: path.join(root, "dist"),
    appType,
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
}

describe("classifyProjectFile", () => {
  test("classify client file", () => {
    const project = createProject(path.resolve("project"));

    expect(classifyProjectFile(project, path.join(project.clientDir, "admin", "main.ts"))).toBe(
      "client",
    );
  });

  test("classify server file", () => {
    const project = createProject(path.resolve("project"));

    expect(classifyProjectFile(project, path.join(project.serverDir, "Code.ts"))).toBe("server");
  });

  test("do not classify path with matching directory prefix", () => {
    const project = createProject(path.resolve("project"));

    expect(
      classifyProjectFile(project, path.join(`${project.clientDir}-old`, "main.ts")),
    ).toBeNull();
    expect(
      classifyProjectFile(project, path.join(`${project.serverDir}-old`, "Code.ts")),
    ).toBeNull();
  });

  test("do not classify unrelated file", () => {
    const project = createProject(path.resolve("project"));

    expect(classifyProjectFile(project, path.join(project.root, "README.md"))).toBeNull();
  });

  test("classify script fallback Code.ts as server file", () => {
    const project = createProject(path.resolve("project"), "script");

    expect(classifyProjectFile(project, path.join(project.root, "src", "Code.ts"))).toBe("server");
  });

  test("do not classify script fallback Code.ts for spa project", () => {
    const project = createProject(path.resolve("project"), "spa");

    expect(classifyProjectFile(project, path.join(project.root, "src", "Code.ts"))).toBeNull();
  });
});
