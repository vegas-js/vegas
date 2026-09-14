import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createBuilder } from "vite";
import { describe, expect, test } from "vitest";

import { buildApp } from "./build";

describe("buildApp", () => {
  test("build vite environment", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const inputFilePath = path.join(tempDirPath, "main.ts");
      const outputDir = path.join(tempDirPath, "dist");
      const outputFilePath = path.join(outputDir, "main.js");

      fs.writeFileSync(inputFilePath, `console.log("hello");`);

      const builder = await createBuilder({
        root: tempDirPath,
        configFile: false,
        environments: {
          client0: {
            build: {
              rolldownOptions: {
                input: inputFilePath,
                output: { entryFileNames: "main.js" },
              },
            },
          },
        },
        build: {
          outDir: outputDir,
          write: false,
        },
        logLevel: "silent",
      });

      await buildApp(fs, builder);

      expect(fs.existsSync(outputFilePath)).toBe(true);
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });
});
