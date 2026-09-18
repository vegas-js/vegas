import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { scanProject, type ResolvedProject } from "../project";
import { buildProjectArtifacts } from "./pipeline";
import { isWebApp } from "./vite";

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

describe("build pipeline", () => {
  test("build spa web app artifacts", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const project = createProject(root);

      fs.mkdirSync(project.clientDir, { recursive: true });
      fs.mkdirSync(project.serverDir, { recursive: true });

      fs.writeFileSync(
        path.join(project.clientDir, "main.ts"),
        `
            document
              .querySelector("#root")!
              .textContent =
                "client-ready";
          `,
      );
      fs.writeFileSync(
        path.join(project.serverDir, "Code.ts"),
        `
            export function doGet() {
              return "server-ready";
            }
          `,
      );

      const snapshot = await scanProject(project);
      const artifacts = await buildProjectArtifacts(project, snapshot);
      const serverArtifact = artifacts.find((artifact) => artifact.path === "Code.js");
      const clientArtifact = artifacts.find((artifact) => artifact.path === "index.html");

      expect(serverArtifact).toBeDefined();
      expect(clientArtifact).toBeDefined();

      if (!serverArtifact || typeof serverArtifact.content !== "string") {
        throw new Error("Expected Code.js text artifact");
      }

      if (!clientArtifact || typeof clientArtifact.content !== "string") {
        throw new Error("Expected index.html text artifact");
      }

      expect(serverArtifact.content).toContain("Function bridge for GAS Client");
      expect(clientArtifact.content).toContain('<div id="root"></div>');
      expect(clientArtifact.content).toContain("client-ready");
      expect(isWebApp(artifacts)).toBe(true);
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("build script artifacts with explicit server directory", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const serverDir = path.join(root, "server");
      const project = createProject(root, "script", serverDir);

      fs.mkdirSync(project.serverDir, { recursive: true });

      fs.writeFileSync(
        path.join(project.serverDir, "Code.ts"),
        `
          function main() {
            return "hello";
          }
        `,
      );

      const snapshot = await scanProject(project);
      const artifacts = await buildProjectArtifacts(project, snapshot);

      expect(artifacts.some((artifact) => artifact.path === "Code.js")).toBe(true);
      expect(artifacts.some((artifact) => artifact.path.endsWith(".html"))).toBe(false);
      expect(isWebApp(artifacts)).toBe(false);
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
