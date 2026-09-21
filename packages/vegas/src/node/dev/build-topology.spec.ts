import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import type { ResolvedProject } from "../project";
import { buildDevTopology } from "./build-topology";

function createProject(root: string): ResolvedProject {
  return {
    root,
    configFile: null,
    clientDir: path.join(root, "src", "client"),
    serverDir: path.join(root, "src", "server"),
    runtimeDataDir: path.join(root, "runtime"),
    outputDir: path.join(root, "dist"),
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
}

describe("buildDevTopology", () => {
  test.each(["development", "production"] as const)(
    "build self-contained HTML client entries in %s mode",
    async (mode) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

      try {
        const project = createProject(root);
        const htmlSource = path.join(project.clientDir, "page.html");
        const clientSource = path.join(project.clientDir, "page.ts");

        fs.mkdirSync(project.clientDir, { recursive: true });
        fs.mkdirSync(project.serverDir, { recursive: true });

        fs.writeFileSync(
          htmlSource,
          `<!doctype html>
          <html>
            <body>
              <main id="page">html-entry-layout</main>
              <script type="module" src="./page.ts"></script>
            </body>
          </html>`,
        );
        fs.writeFileSync(clientSource, `console.log("html-client-ready");`);
        fs.writeFileSync(
          path.join(project.serverDir, "Code.ts"),
          `export function doGet() { return "server-ready"; }`,
        );

        const topology = await buildDevTopology(project, mode);
        const htmlArtifact = topology.clientArtifacts.find(
          (artifact) => artifact.path === "page.html",
        );

        expect(topology.snapshot.clientHtmlEntries).toStrictEqual([
          {
            sourcePath: htmlSource,
            htmlPath: "page.html",
          },
        ]);
        expect(htmlArtifact).toBeDefined();
        expect(topology.serverArtifacts.some((artifact) => artifact.path === "Code.js")).toBe(true);

        if (!htmlArtifact || typeof htmlArtifact.content !== "string") {
          throw new Error("Expected page.html text artifact");
        }

        expect(htmlArtifact.content).toContain("html-entry-layout");
        expect(htmlArtifact.content).toContain("html-client-ready");
        expect(htmlArtifact.content).not.toMatch(/<script[^>]+\bsrc=/i);
      } finally {
        fs.rmSync(root, {
          recursive: true,
          force: true,
        });
      }
    },
  );
});
