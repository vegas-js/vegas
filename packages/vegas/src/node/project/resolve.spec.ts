import path from "node:path";

import { describe, expect, test } from "vitest";

import type { UserConfig } from "../../shared/config";
import { resolveProject } from "./resolve";

const fsRoot = path.parse(process.cwd()).root;
const cwd = path.join(fsRoot, "home", "user", "project");
const cliRoot = path.join(fsRoot, "home", "user", "other");

function resolve(
  userConfig: UserConfig = {},
  options: {
    cwd?: string;
    cliRoot?: string;
    configFile?: string | null;
  } = {},
) {
  return resolveProject(userConfig, {
    cwd: options.cwd ?? cwd,
    root: options.cliRoot,
    configFile: options.configFile ?? null,
  });
}

describe("resolveProject", () => {
  test("resolve defaults", () => {
    const project = resolve();

    expect(project).toStrictEqual({
      root: cwd,
      configFile: null,
      clientDir: path.join(cwd, "src", "client"),
      serverDir: path.join(cwd, "src", "server"),
      runtimeDataDir: path.join(cwd, "runtime"),
      outputDir: path.join(cwd, "dist"),
      appType: "spa",
      plugins: [],
      devServer: {
        host: undefined,
        port: undefined,
        open: false,
      },

      appsScript: {
        scriptId: undefined,
        manifest: {
          dependencies: undefined,
          exceptionLogging: "STACKDRIVER",
          executionApi: undefined,
          oauthScopes: undefined,
          runtimeVersion: "V8",
          sheets: undefined,
          timeZone: "UTC",
          urlFetchWhitelist: undefined,
          webapp: {
            access: "MYSELF",
            executeAs: "USER_ACCESSING",
          },
        },
      },
    });
  });

  describe("root", () => {
    describe("precedence", () => {
      test("use cwd when neither cli root nor config root is specified", () => {
        const project = resolve();

        expect(project.root).toBe(cwd);
      });

      test("use config root when cli root is not specified", () => {
        const project = resolve({ root: "config-root" });

        expect(project.root).toBe(path.join(cwd, "config-root"));
      });

      test("prefer cli root over config root", () => {
        const project = resolve({ root: "config-root" }, { cliRoot });

        expect(project.root).toBe(cliRoot);
      });
    });

    describe("cli root", () => {
      test("resolve relative cli root from cwd", () => {
        const project = resolve({}, { cliRoot: "other" });

        expect(project.root).toBe(path.join(cwd, "other"));
      });

      test("preserve absolute cli root", () => {
        const root = path.join(fsRoot, "absolute", "project");

        const project = resolve({}, { cliRoot: root });

        expect(project.root).toBe(root);
      });
    });

    describe("config root", () => {
      test.each(["sub", "./sub"])("resolve relative config root from cwd: %s", (root) => {
        const project = resolve({ root });

        expect(project.root).toBe(path.join(cwd, "sub"));
      });

      test("preserve absolute config root", () => {
        const root = path.join(fsRoot, "absolute", "project");

        const project = resolve({ root });

        expect(project.root).toBe(root);
      });

      test("resolve dot to cwd", () => {
        const project = resolve({ root: "." });

        expect(project.root).toBe(cwd);
      });

      test("preserve filesystem root", () => {
        const project = resolve({ root: fsRoot });

        expect(project.root).toBe(fsRoot);
      });
    });
  });

  describe("project directories", () => {
    test("resolve default directories from project root", () => {
      const root = path.join(cwd, "sub");

      const project = resolve({ root });

      expect(project.clientDir).toBe(path.join(root, "src", "client"));
      expect(project.serverDir).toBe(path.join(root, "src", "server"));
      expect(project.runtimeDataDir).toBe(path.join(root, "runtime"));
      expect(project.outputDir).toBe(path.join(root, "dist"));
    });

    test("resolve relative directories from project root", () => {
      const project = resolve({
        clientDir: "client",
        serverDir: "server",
        runtimeDataDir: "mocks",
        output: { dir: "build" },
      });

      expect(project.clientDir).toBe(path.join(cwd, "client"));
      expect(project.serverDir).toBe(path.join(cwd, "server"));
      expect(project.runtimeDataDir).toBe(path.join(cwd, "mocks"));
      expect(project.outputDir).toBe(path.join(cwd, "build"));
    });

    test("resolve relative directories from resolved config root", () => {
      const project = resolve({
        root: "sub",
        clientDir: "client",
        serverDir: "server",
        runtimeDataDir: "mocks",
        output: { dir: "build" },
      });

      const root = path.join(cwd, "sub");

      expect(project.root).toBe(root);
      expect(project.clientDir).toBe(path.join(root, "client"));
      expect(project.serverDir).toBe(path.join(root, "server"));
      expect(project.runtimeDataDir).toBe(path.join(root, "mocks"));
      expect(project.outputDir).toBe(path.join(root, "build"));
    });

    test("resolve relative directories from cli root", () => {
      const project = resolve(
        {
          clientDir: "client",
          serverDir: "server",
        },
        { cliRoot },
      );

      expect(project.clientDir).toBe(path.join(cliRoot, "client"));
      expect(project.serverDir).toBe(path.join(cliRoot, "server"));
    });

    test("preserve absolute directories", () => {
      const clientDir = path.join(fsRoot, "tmp", "client");
      const serverDir = path.join(fsRoot, "tmp", "server");
      const runtimeDataDir = path.join(fsRoot, "tmp", "runtime");
      const outputDir = path.join(fsRoot, "tmp", "dist");

      const project = resolve({
        clientDir,
        serverDir,
        runtimeDataDir,
        output: {
          dir: outputDir,
          allowOutsideRoot: true,
        },
      });

      expect(project.clientDir).toBe(clientDir);
      expect(project.serverDir).toBe(serverDir);
      expect(project.runtimeDataDir).toBe(runtimeDataDir);
      expect(project.outputDir).toBe(outputDir);
    });

    test("use src as default server directory for script project", () => {
      const project = resolve({
        appType: "script",
      });

      expect(project.serverDir).toBe(path.join(cwd, "src"));
    });

    test("preserve explicit server directory for script project", () => {
      const project = resolve({
        appType: "script",
        serverDir: "server",
      });

      expect(project.serverDir).toBe(path.join(cwd, "server"));
    });
  });

  describe("config file", () => {
    test("preserve config file", () => {
      const configFile = path.join(cwd, "vegas.config.ts");

      const project = resolve({}, { configFile });

      expect(project.configFile).toBe(configFile);
    });
  });

  describe("options", () => {
    test("resolve app type", () => {
      const project = resolve({ appType: "script" });

      expect(project.appType).toBe("script");
    });

    test("preserve plugins", () => {
      const plugin = { name: "test-plugin" };

      const project = resolve({ plugins: [plugin] });

      expect(project.plugins).toEqual([plugin]);
    });

    test("resolve dev server options", () => {
      const project = resolve({
        devServer: {
          host: true,
          port: 4173,
          open: true,
        },
      });

      expect(project.devServer).toStrictEqual({
        host: true,
        port: 4173,
        open: true,
      });
    });
  });

  describe("apps script", () => {
    test("resolve script id", () => {
      const project = resolve({
        appsScript: {
          scriptId: "script-id",
        },
      });

      expect(project.appsScript.scriptId).toBe("script-id");
    });
  });

  describe("manifest", () => {
    test("resolve apps script manifest", () => {
      const project = resolve({
        appsScript: {
          manifest: {
            exceptionLogging: "NONE",
            executionApi: {
              access: "DOMAIN",
            },
            runtimeVersion: "STABLE",
            timeZone: "Asia/Tokyo",
            oauthScopes: ["scope"],
            sheets: {
              macros: [
                {
                  defaultShortcut: "Ctrl+Alt+Shift+1",
                  functionName: "runMacro",
                  menuName: "Run macro",
                },
              ],
            },
            urlFetchWhitelist: ["https://example.com/api/"],
            webapp: {
              access: "ANYONE",
              executeAs: "USER_DEPLOYING",
            },
          },
        },
      });

      expect(project.appsScript.manifest).toStrictEqual({
        dependencies: undefined,
        exceptionLogging: "NONE",
        executionApi: {
          access: "DOMAIN",
        },
        oauthScopes: ["scope"],
        runtimeVersion: "STABLE",
        sheets: {
          macros: [
            {
              defaultShortcut: "Ctrl+Alt+Shift+1",
              functionName: "runMacro",
              menuName: "Run macro",
            },
          ],
        },
        timeZone: "Asia/Tokyo",
        urlFetchWhitelist: ["https://example.com/api/"],
        webapp: {
          access: "ANYONE",
          executeAs: "USER_DEPLOYING",
        },
      });
    });

    test("apply defaults to unspecified manifest options", () => {
      const project = resolve({
        appsScript: {
          manifest: {
            timeZone: "Asia/Tokyo",
          },
        },
      });

      expect(project.appsScript.manifest).toStrictEqual({
        dependencies: undefined,
        exceptionLogging: "STACKDRIVER",
        executionApi: undefined,
        oauthScopes: undefined,
        runtimeVersion: "V8",
        sheets: undefined,
        timeZone: "Asia/Tokyo",
        urlFetchWhitelist: undefined,
        webapp: {
          access: "MYSELF",
          executeAs: "USER_ACCESSING",
        },
      });
    });
  });

  describe("output directory safety", () => {
    test("reject project root as output directory", () => {
      expect(() =>
        resolve({
          output: {
            dir: ".",
          },
        }),
      ).toThrow('Invalid Vegas config: "output.dir" must not resolve to the project root.');
    });

    test("reject project ancestor as output directory even when outside root is allowed", () => {
      expect(() =>
        resolve({
          output: {
            dir: "..",
            allowOutsideRoot: true,
          },
        }),
      ).toThrow('Invalid Vegas config: "output.dir" must not contain the project root.');
    });

    test("reject output directory containing client source directory", () => {
      expect(() =>
        resolve({
          output: {
            dir: "src",
          },
        }),
      ).toThrow('Invalid Vegas config: "output.dir" must not contain "clientDir".');
    });

    test("reject output directory containing server source directory", () => {
      expect(() =>
        resolve({
          clientDir: "client",
          output: {
            dir: "src",
          },
        }),
      ).toThrow('Invalid Vegas config: "output.dir" must not contain "serverDir".');
    });

    test("reject output directory containing runtime data directory", () => {
      expect(() =>
        resolve({
          output: {
            dir: "runtime",
          },
        }),
      ).toThrow('Invalid Vegas config: "output.dir" must not contain "runtimeDataDir".');
    });

    test("reject output directory outside project root by default", () => {
      expect(() =>
        resolve({
          output: {
            dir: "../dist",
          },
        }),
      ).toThrow(
        'Invalid Vegas config: "output.dir" resolves outside the project root. Set "output.allowOutsideRoot" to true to allow it.',
      );
    });

    test("allow output directory outside project root with explicit opt in", () => {
      const project = resolve({
        output: {
          dir: "../dist",
          allowOutsideRoot: true,
        },
      });

      expect(project.outputDir).toBe(path.resolve(cwd, "..", "dist"));
    });
  });
});
