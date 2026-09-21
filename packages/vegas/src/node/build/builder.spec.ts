import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import type { ProjectSnapshot, ResolvedProject } from "../project";
import { createProjectBuilder } from "./builder";
import { buildApp } from "./vite";

describe("createProjectBuilder", () => {
  test("create a Vite builder from the resolved project and snapshot", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const sourcePath = path.join(root, "src", "Code.ts");
      const project: ResolvedProject = {
        root,
        configFile: null,
        clientDir: path.join(root, "src", "client"),
        serverDir: path.join(root, "src"),
        runtimeDataDir: path.join(root, "runtime"),
        outputDir: path.join(root, "dist"),
        appType: "script",
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
      };
      const snapshot: ProjectSnapshot = {
        clientSources: [],
        serverSources: [sourcePath],
        runtimeDataSources: [],
        clientModuleEntries: [],
        clientHtmlEntries: [],
      };

      fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
      fs.writeFileSync(
        sourcePath,
        `
          function main() {
            return "server-ready";
          }
        `,
      );

      const builder = await createProjectBuilder(project, snapshot, "production");
      const artifacts = await buildApp(builder, /^server$/);

      expect(artifacts.some((artifact) => artifact.path === "Code.js")).toBe(true);
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
