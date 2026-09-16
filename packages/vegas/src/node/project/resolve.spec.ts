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
      gasMockDir: path.join(cwd, "mock"),
      outputDir: path.join(cwd, "dist"),
      appType: "spa",
      plugins: [],
      gas: {
        dependencies: undefined,
        exceptionLogging: "STACKDRIVER",
        oauthScopes: undefined,
        runtimeVersion: "V8",
        timeZone: "UTC",
        webapp: {
          access: "MYSELF",
          executeAs: "USER_ACCESSING",
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
      expect(project.gasMockDir).toBe(path.join(root, "mock"));
      expect(project.outputDir).toBe(path.join(root, "dist"));
    });

    test("resolve relative directories from project root", () => {
      const project = resolve({
        clientDir: "client",
        serverDir: "server",
        gasMockDir: "mocks",
        output: { dir: "build" },
      });

      expect(project.clientDir).toBe(path.join(cwd, "client"));
      expect(project.serverDir).toBe(path.join(cwd, "server"));
      expect(project.gasMockDir).toBe(path.join(cwd, "mocks"));
      expect(project.outputDir).toBe(path.join(cwd, "build"));
    });

    test("resolve relative directories from resolved config root", () => {
      const project = resolve({
        root: "sub",
        clientDir: "client",
        serverDir: "server",
        gasMockDir: "mocks",
        output: { dir: "build" },
      });

      const root = path.join(cwd, "sub");

      expect(project.root).toBe(root);
      expect(project.clientDir).toBe(path.join(root, "client"));
      expect(project.serverDir).toBe(path.join(root, "server"));
      expect(project.gasMockDir).toBe(path.join(root, "mocks"));
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
      const gasMockDir = path.join(fsRoot, "tmp", "mock");
      const outputDir = path.join(fsRoot, "tmp", "dist");

      const project = resolve({
        clientDir,
        serverDir,
        gasMockDir,
        output: { dir: outputDir },
      });

      expect(project.clientDir).toBe(clientDir);
      expect(project.serverDir).toBe(serverDir);
      expect(project.gasMockDir).toBe(gasMockDir);
      expect(project.outputDir).toBe(outputDir);
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
  });

  describe("manifest", () => {
    test("resolve apps script manifest", () => {
      const project = resolve({
        appsScript: {
          manifest: {
            exceptionLogging: "NONE",
            runtimeVersion: "STABLE",
            timeZone: "Asia/Tokyo",
            oauthScopes: ["scope"],
            webapp: {
              access: "ANYONE",
              executeAs: "USER_DEPLOYING",
            },
          },
        },
      });

      expect(project.gas).toStrictEqual({
        dependencies: undefined,
        exceptionLogging: "NONE",
        oauthScopes: ["scope"],
        runtimeVersion: "STABLE",
        timeZone: "Asia/Tokyo",
        webapp: {
          access: "ANYONE",
          executeAs: "USER_DEPLOYING",
        },
      });
    });

    test("resolve legacy gas manifest", () => {
      const project = resolve({
        gas: {
          exceptionLogging: "NONE",
          runtimeVersion: "STABLE",
          timeZone: "Asia/Tokyo",
          oauthScopes: ["scope"],
          webapp: {
            access: "ANYONE",
            executeAs: "USER_DEPLOYING",
          },
        },
      });

      expect(project.gas).toStrictEqual({
        dependencies: undefined,
        exceptionLogging: "NONE",
        oauthScopes: ["scope"],
        runtimeVersion: "STABLE",
        timeZone: "Asia/Tokyo",
        webapp: {
          access: "ANYONE",
          executeAs: "USER_DEPLOYING",
        },
      });
    });

    test("prefer apps script manifest over legacy gas manifest", () => {
      const project = resolve({
        gas: {
          exceptionLogging: "STACKDRIVER",
          runtimeVersion: "V8",
          timeZone: "UTC",
          oauthScopes: ["legacy-scope"],
          webapp: {
            access: "MYSELF",
            executeAs: "USER_ACCESSING",
          },
        },

        appsScript: {
          manifest: {
            exceptionLogging: "NONE",
            timeZone: "Asia/Tokyo",
            webapp: {
              access: "ANYONE",
            },
          },
        },
      });

      expect(project.gas).toStrictEqual({
        dependencies: undefined,
        exceptionLogging: "NONE",
        oauthScopes: ["legacy-scope"],
        runtimeVersion: "V8",
        timeZone: "Asia/Tokyo",
        webapp: {
          access: "ANYONE",
          executeAs: "USER_ACCESSING",
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

      expect(project.gas).toStrictEqual({
        dependencies: undefined,
        exceptionLogging: "STACKDRIVER",
        oauthScopes: undefined,
        runtimeVersion: "V8",
        timeZone: "Asia/Tokyo",
        webapp: {
          access: "MYSELF",
          executeAs: "USER_ACCESSING",
        },
      });
    });
  });
});
