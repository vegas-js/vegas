import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createBuilder } from "vite";
import { describe, expect, test } from "vitest";

import { scanProject, type ResolvedProject } from "../project";
import { createBuildPlan } from "./plan";
import { buildApp, createBuilderConfig, isWebApp } from "./vite";

function createProject(root: string): ResolvedProject {
  return {
    root,
    configFile: null,
    clientDir: path.join(root, "src", "client"),
    serverDir: path.join(root, "src", "server"),
    gasMockDir: path.join(root, "mock"),
    outputDir: path.join(root, "dist"),
    appType: "spa",
    plugins: [],
    gas: {
      exceptionLogging: "STACKDRIVER",
      runtimeVersion: "V8",
      timeZone: "UTC",
      webapp: {
        access: "MYSELF",
        executeAs: "USER_ACCESSING",
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
      const plan = createBuildPlan(project, snapshot, "production");
      const builder = await createBuilder(createBuilderConfig(plan));

      const artifacts = await buildApp(builder);
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
});
