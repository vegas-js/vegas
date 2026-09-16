import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import { loadProject } from "./load";

const fsRoot = path.parse(process.cwd()).root;
const cwd = path.join(fsRoot, "home", "user");
const projectRoot = path.join(cwd, "project");

describe("loadProject", () => {
  test("load config from cwd by default", async () => {
    const loadConfig = vi.fn().mockResolvedValue({
      config: {},
      configFile: null,
    });

    const project = await loadProject({ cwd }, loadConfig);

    expect(loadConfig).toHaveBeenCalledWith(cwd);
    expect(project.root).toBe(cwd);
  });

  test("load config from cli root", async () => {
    const loadConfig = vi.fn().mockResolvedValue({
      config: {},
      configFile: null,
    });

    const project = await loadProject(
      {
        cwd,
        root: "project",
      },
      loadConfig,
    );

    expect(loadConfig).toHaveBeenCalledWith(projectRoot);
    expect(project.root).toBe(projectRoot);
  });

  test("resolve loaded config", async () => {
    const configFile = path.join(cwd, "vegas.config.ts");
    const loadConfig = vi.fn().mockResolvedValue({
      config: { appType: "script" },
      configFile,
    });

    const project = await loadProject({ cwd }, loadConfig);

    expect(project.appType).toBe("script");
    expect(project.configFile).toBe(configFile);
  });

  test("validate loaded config before resolving project", async () => {
    const loadConfig = vi.fn().mockResolvedValue({
      config: {
        appType: "invalid",
      },
      configFile: path.join(cwd, "vegas.config.ts"),
    });

    await expect(loadProject({ cwd }, loadConfig)).rejects.toThrow(
      'Invalid Vegas config: "appType" must be one of "spa", "script".',
    );
  });

  describe("with real config file", () => {
    test("use defaults when config file does not exist", async () => {
      const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

      try {
        const project = await loadProject({ cwd: tempDirPath });

        expect(project.configFile).toBeNull();
        expect(project.root).toBe(tempDirPath);
      } finally {
        fs.rmSync(tempDirPath, {
          recursive: true,
          force: true,
        });
      }
    });

    test("load vegas.config.ts", async () => {
      const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

      try {
        const configFile = path.join(tempDirPath, "vegas.config.ts");
        fs.writeFileSync(configFile, `export default { appType: "script" };`);

        const project = await loadProject({ cwd: tempDirPath });

        expect(project.configFile).toBe(configFile);
        expect(project.appType).toBe("script");
      } finally {
        fs.rmSync(tempDirPath, {
          recursive: true,
          force: true,
        });
      }
    });

    test("reject invalid vegas.config.ts", async () => {
      const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

      try {
        const configFile = path.join(tempDirPath, "vegas.config.ts");

        fs.writeFileSync(
          configFile,
          `
        export default {
          gas: {},
        };
      `,
        );

        await expect(loadProject({ cwd: tempDirPath })).rejects.toThrow(
          'Invalid Vegas config: unknown option "gas".',
        );
      } finally {
        fs.rmSync(tempDirPath, {
          recursive: true,
          force: true,
        });
      }
    });
  });
});
