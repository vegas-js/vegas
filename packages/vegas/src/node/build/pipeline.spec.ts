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

  test("build JavaScript and JSX client entries", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const project: ResolvedProject = {
        ...createProject(root),
        plugins: [
          {
            name: "jsx-transform-fixture",
            config() {
              return {
                oxc: {
                  jsx: {
                    runtime: "classic",
                    pragma: "createElement",
                    pragmaFrag: "Fragment",
                  },
                },
              };
            },
          },
        ],
      };
      const adminDir = path.join(project.clientDir, "admin");

      fs.mkdirSync(adminDir, { recursive: true });
      fs.mkdirSync(project.serverDir, { recursive: true });

      fs.writeFileSync(
        path.join(project.clientDir, "main.js"),
        `
          document.querySelector("#root").textContent = "javascript-client-ready";
        `,
      );
      fs.writeFileSync(
        path.join(adminDir, "main.jsx"),
        `
          function createElement(_type, _props, child) {
            return child;
          }

          const view = <div>jsx-client-ready</div>;
          document.querySelector("#root").textContent = view;
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
      const indexArtifact = artifacts.find((artifact) => artifact.path === "index.html");
      const adminArtifact = artifacts.find((artifact) => artifact.path === "admin.html");

      expect(snapshot.clientSources).toStrictEqual([
        path.join(adminDir, "main.jsx"),
        path.join(project.clientDir, "main.js"),
      ]);
      expect(snapshot.clientModuleEntries).toStrictEqual([
        {
          id: "admin",
          sourcePath: path.join(adminDir, "main.jsx"),
          htmlPath: "admin.html",
        },
        {
          id: "index",
          sourcePath: path.join(project.clientDir, "main.js"),
          htmlPath: "index.html",
        },
      ]);
      expect(snapshot.clientHtmlEntries).toStrictEqual([]);

      expect(indexArtifact).toBeDefined();
      expect(adminArtifact).toBeDefined();

      if (!indexArtifact || typeof indexArtifact.content !== "string") {
        throw new Error("Expected index.html text artifact");
      }

      if (!adminArtifact || typeof adminArtifact.content !== "string") {
        throw new Error("Expected admin.html text artifact");
      }

      expect(indexArtifact.content).toContain("javascript-client-ready");
      expect(adminArtifact.content).toContain("jsx-client-ready");
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("build HTML client entry as a self-contained artifact", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const project = createProject(root);
      const htmlSource = path.join(project.clientDir, "page.html");
      const clientSource = path.join(project.clientDir, "page.ts");
      const styleSource = path.join(project.clientDir, "page.css");

      fs.mkdirSync(project.clientDir, { recursive: true });
      fs.mkdirSync(project.serverDir, { recursive: true });

      fs.writeFileSync(
        htmlSource,
        `<!doctype html>
        <html>
          <head>
            <title>HTML Entry</title>
            <link rel="stylesheet" href="./page.css">
          </head>
          <body>
            <main id="page">html-entry-layout</main>
            <script type="module" src="./page.ts"></script>
          </body>
        </html>`,
      );
      fs.writeFileSync(
        clientSource,
        `document.querySelector("#page")?.setAttribute("data-ready", "html-client-ready");`,
      );
      fs.writeFileSync(styleSource, `#page { color: red; }`);
      fs.writeFileSync(
        path.join(project.serverDir, "Code.ts"),
        `export function doGet() { return "server-ready"; }`,
      );

      const snapshot = await scanProject(project);
      const artifacts = await buildProjectArtifacts(project, snapshot);
      const htmlArtifact = artifacts.find((artifact) => artifact.path === "page.html");

      expect(snapshot.clientModuleEntries).toStrictEqual([]);
      expect(snapshot.clientHtmlEntries).toStrictEqual([
        {
          sourcePath: htmlSource,
          htmlPath: "page.html",
        },
      ]);
      expect(htmlArtifact).toBeDefined();

      if (!htmlArtifact || typeof htmlArtifact.content !== "string") {
        throw new Error("Expected page.html text artifact");
      }

      expect(htmlArtifact.content).toContain("<title>HTML Entry</title>");
      expect(htmlArtifact.content).toContain("html-entry-layout");
      expect(htmlArtifact.content).toContain("html-client-ready");
      expect(htmlArtifact.content).toContain("color:");
      expect(htmlArtifact.content).not.toMatch(/<script[^>]+\bsrc=/i);
      expect(htmlArtifact.content).not.toMatch(/<link[^>]+\brel="stylesheet"/i);
      expect(
        artifacts.some(
          (artifact) =>
            artifact.path !== "Code.js" &&
            artifact.path !== "page.html" &&
            artifact.path !== "appsscript.json",
        ),
      ).toBe(false);
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

  test("build JavaScript server artifacts", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const serverDir = path.join(root, "server");
      const project = createProject(root, "script", serverDir);
      const serverSource = path.join(project.serverDir, "Code.js");

      fs.mkdirSync(project.serverDir, { recursive: true });

      fs.writeFileSync(
        serverSource,
        `
          export function main() {
            return "javascript-server-ready";
          }
        `,
      );

      const snapshot = await scanProject(project);
      const artifacts = await buildProjectArtifacts(project, snapshot);
      const serverArtifact = artifacts.find((artifact) => artifact.path === "Code.js");

      expect(snapshot.serverSources).toStrictEqual([serverSource]);
      expect(serverArtifact).toBeDefined();

      if (!serverArtifact || typeof serverArtifact.content !== "string") {
        throw new Error("Expected Code.js text artifact");
      }

      expect(serverArtifact.content).toContain("javascript-server-ready");
      expect(serverArtifact.content).toContain("Function bridge for GAS Client");
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
