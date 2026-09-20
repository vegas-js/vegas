import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { loadModule } from "./load";

describe("loadModule", () => {
  test("load module relative to project root", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const projectDir = path.join(tempDirPath, "project");

    try {
      fs.mkdirSync(projectDir, { recursive: true });

      const configPath = path.join(projectDir, "config.ts");

      fs.writeFileSync(
        configPath,
        `
          import { value } from "./helper";
          
          export default { value };
        `,
      );

      fs.writeFileSync(path.join(projectDir, "helper.ts"), 'export const value = "loaded";');

      const loaded = await loadModule({
        root: projectDir,
        filePath: configPath,
      });

      expect(loaded).toStrictEqual({ value: "loaded" });
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("resolve bare import from ancestor node_modules", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const workspaceDir = path.join(tempDirPath, "workspace");
    const projectDir = path.join(workspaceDir, "apps", "project");
    const packageDir = path.join(workspaceDir, "node_modules", "fixture-package");

    try {
      fs.mkdirSync(projectDir, { recursive: true });
      fs.mkdirSync(packageDir, { recursive: true });

      fs.writeFileSync(
        path.join(packageDir, "package.json"),
        JSON.stringify({
          name: "fixture-package",
          version: "1.0.0",
          type: "module",
          exports: "./index.js",
        }),
      );
      fs.writeFileSync(path.join(packageDir, "index.js"), 'export const value = "hoisted";');

      const configPath = path.join(projectDir, "config.ts");
      fs.writeFileSync(
        configPath,
        `
          import { value } from "fixture-package";

          export default { value };
        `,
      );

      await expect(
        loadModule({
          root: projectDir,
          filePath: configPath,
        }),
      ).resolves.toStrictEqual({ value: "hoisted" });
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("keep relative dynamic imports usable after temporary output cleanup", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const projectDir = path.join(tempDirPath, "project");

    try {
      fs.mkdirSync(projectDir, { recursive: true });

      const configPath = path.join(projectDir, "config.ts");

      fs.writeFileSync(
        configPath,
        `
          export default {
            async loadValue() {
              const module = await import("./dynamic");
              return module.value;
            },
          };
        `,
      );
      fs.writeFileSync(path.join(projectDir, "dynamic.ts"), 'export const value = "loaded";');

      const loaded = (await loadModule({
        root: projectDir,
        filePath: configPath,
      })) as {
        loadValue(): Promise<string>;
      };

      await expect(loaded.loadValue()).resolves.toBe("loaded");
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("ignore project vite config", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const projectDir = path.join(tempDirPath, "project");

    try {
      fs.mkdirSync(projectDir, {
        recursive: true,
      });

      const configPath = path.join(projectDir, "config.ts");

      fs.writeFileSync(configPath, "export default { value: 1 };");
      fs.writeFileSync(
        path.join(projectDir, "vite.config.ts"),
        `
          throw new Error(
            "vite config must not be loaded",
          );

          export default {};
        `,
      );

      const loaded = await loadModule({
        root: projectDir,
        filePath: configPath,
      });

      expect(loaded).toStrictEqual({ value: 1 });
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("load module from path containing url special characters", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const projectDir = path.join(tempDirPath, "project#1%test");

    try {
      fs.mkdirSync(projectDir, { recursive: true });

      const configPath = path.join(projectDir, "config.ts");

      fs.writeFileSync(
        configPath,
        `
        export default {
          value: "loaded",
        };
      `,
      );

      const loaded = await loadModule({
        root: projectDir,
        filePath: configPath,
      });

      expect(loaded).toStrictEqual({ value: "loaded" });
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject module without default export", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const modulePath = path.join(tempDirPath, "module.ts");

      fs.writeFileSync(
        modulePath,
        `
        export const value = "loaded";
      `,
      );

      await expect(
        loadModule({
          root: tempDirPath,
          filePath: modulePath,
        }),
      ).rejects.toThrow("module must have a default export.");
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test.each([
    ["null", null],
    ["false", false],
    ["0", 0],
    ['""', ""],
    ["undefined", undefined],
  ])("load falsy default export: %s", async (source, expected) => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const modulePath = path.join(tempDirPath, "module.ts");

      fs.writeFileSync(modulePath, `export default ${source};`);

      const loaded = await loadModule({
        root: tempDirPath,
        filePath: modulePath,
      });

      expect(loaded).toBe(expected);
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });
});
