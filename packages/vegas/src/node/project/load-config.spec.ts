import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { loadUserConfig } from "./load-config";

async function withTempDir<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "vegas-config-"));

  try {
    return await run(directory);
  } finally {
    await fs.promises.rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

describe("loadUserConfig", () => {
  test("return empty config when vegas.config.ts does not exist", async () => {
    await withTempDir(async (directory) => {
      await expect(loadUserConfig(directory)).resolves.toStrictEqual({
        config: {},
        configFile: null,
      });
    });
  });

  test("load vegas.config.ts", async () => {
    await withTempDir(async (directory) => {
      const configFile = path.join(directory, "vegas.config.ts");

      await fs.promises.writeFile(configFile, `export default { appType: "script" };`);

      await expect(loadUserConfig(directory)).resolves.toStrictEqual({
        config: { appType: "script" },
        configFile,
      });
    });
  });

  test("leave config validation to the project loader", async () => {
    await withTempDir(async (directory) => {
      const configFile = path.join(directory, "vegas.config.ts");

      await fs.promises.writeFile(configFile, `export default { gas: {} };`);

      await expect(loadUserConfig(directory)).resolves.toStrictEqual({
        config: { gas: {} },
        configFile,
      });
    });
  });
});
