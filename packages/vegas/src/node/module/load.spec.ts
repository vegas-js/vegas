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
});
