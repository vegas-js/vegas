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

      const artifacts = await buildApp(builder);

      expect(artifacts.some((artifact) => artifact.path === "main.js")).toBe(true);
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("collect artifacts from multiple rolldown outputs", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const inputFilePath = path.join(tempDirPath, "main.ts");
      const outputDir = path.join(tempDirPath, "dist");

      fs.writeFileSync(inputFilePath, `console.log("hello");`);

      const builder = await createBuilder({
        root: tempDirPath,
        configFile: false,
        environments: {
          client0: {
            build: {
              rolldownOptions: {
                input: inputFilePath,
                output: [{ entryFileNames: "first.js" }, { entryFileNames: "second.js" }],
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

      const artifacts = await buildApp(builder);
      const artifactPaths = artifacts.map((artifact) => artifact.path);

      expect(artifactPaths).toContain("first.js");
      expect(artifactPaths).toContain("second.js");
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("preserve binary asset", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const inputFilePath = path.join(tempDirPath, "main.ts");
      const outputDir = path.join(tempDirPath, "dist");

      const binary = new Uint8Array([0x00, 0xff, 0x80, 0x41]);

      fs.writeFileSync(inputFilePath, `console.log("hello");`);

      const builder = await createBuilder({
        root: tempDirPath,
        configFile: false,
        plugins: [
          {
            name: "emit-binary",

            generateBundle() {
              this.emitFile({
                type: "asset",
                fileName: "binary.dat",
                source: binary,
              });
            },
          },
        ],
        environments: {
          client0: {
            build: {
              rolldownOptions: {
                input: inputFilePath,
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

      const artifacts = await buildApp(builder);
      const binaryArtifact = artifacts.find((artifact) => artifact.path === "binary.dat");

      expect(binaryArtifact).toBeDefined();

      if (!binaryArtifact || typeof binaryArtifact.content === "string") {
        throw new Error("Expected binary artifact");
      }

      expect(Array.from(binaryArtifact.content)).toStrictEqual(Array.from(binary));
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });
});
