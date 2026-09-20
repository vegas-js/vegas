import path from "node:path";

import { describe, expect, test } from "vitest";

import type { ResolvedProject } from "../project";
import { classifyProjectFile } from "./project-file";

function createProject(
  root: string,
  appType: "spa" | "script" = "spa",
  serverDir = appType === "script" ? path.join(root, "src") : path.join(root, "src", "server"),
): ResolvedProject {
  return {
    root,
    configFile: null,
    clientDir: path.join(root, "src", "client"),
    serverDir,
    runtimeDataDir: path.join(root, "runtime"),
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

  test("classify runtime data file", () => {
    const project = createProject(path.resolve("project"));

    expect(classifyProjectFile(project, path.join(project.runtimeDataDir, "session.ts"))).toBe(
      "runtime-data",
    );
  });

  test("give runtime data precedence over overlapping project directories", () => {
    const root = path.resolve("project");
    const project = {
      ...createProject(root),
      serverDir: path.join(root, "src"),
      runtimeDataDir: path.join(root, "src", "client", "runtime"),
    };

    expect(classifyProjectFile(project, path.join(project.runtimeDataDir, "session.ts"))).toBe(
      "runtime-data",
    );
    expect(classifyProjectFile(project, path.join(project.clientDir, "main.ts"))).toBe("client");
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
    expect(
      classifyProjectFile(project, path.join(`${project.runtimeDataDir}-old`, "session.ts")),
    ).toBeNull();
  });

  test("do not classify unrelated file", () => {
    const project = createProject(path.resolve("project"));

    expect(classifyProjectFile(project, path.join(project.root, "README.md"))).toBeNull();
  });

  test("classify file in default script server directory", () => {
    const project = createProject(path.resolve("project"), "script");

    expect(classifyProjectFile(project, path.join(project.root, "src", "Code.ts"))).toBe("server");
  });

  test("do not classify script fallback Code.ts for spa project", () => {
    const project = createProject(path.resolve("project"), "spa");

    expect(classifyProjectFile(project, path.join(project.root, "src", "Code.ts"))).toBeNull();
  });

  test("respect explicit server directory for script project", () => {
    const root = path.resolve("project");
    const serverDir = path.join(root, "server");
    const project = createProject(root, "script", serverDir);

    expect(classifyProjectFile(project, path.join(serverDir, "Code.ts"))).toBe("server");
    expect(classifyProjectFile(project, path.join(root, "src", "Code.ts"))).toBeNull();
  });
});
