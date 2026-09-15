import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { readBuildArtifacts } from "./read-output";

describe("readBuildArtifacts", () => {
  test("read output files as logical build artifacts", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const outputDir = path.join(root, "custom-output");

    try {
      fs.mkdirSync(path.join(outputDir, "pages"), { recursive: true });

      fs.writeFileSync(path.join(outputDir, "appsscript.json"), "{}");
      fs.writeFileSync(path.join(outputDir, "Code.js"), "function hello() {}");
      fs.writeFileSync(path.join(outputDir, "pages", "dashboard.html"), "<h1>Dashboard</h1>");

      const artifacts = await readBuildArtifacts(outputDir);

      expect(artifacts.map((artifact) => artifact.path)).toStrictEqual([
        "Code.js",
        "appsscript.json",
        "pages/dashboard.html",
      ]);

      const contents = artifacts.map((artifact) => {
        expect(artifact.content).toBeInstanceOf(Uint8Array);

        if (typeof artifact.content === "string") {
          throw new Error(`Expected binary artifact content: ${artifact.path}`);
        }

        return new TextDecoder().decode(artifact.content);
      });

      expect(contents).toStrictEqual(["function hello() {}", "{}", "<h1>Dashboard</h1>"]);
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("preserve file bytes", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const outputDir = path.join(root, "dist");

    try {
      fs.mkdirSync(outputDir);

      const bytes = new Uint8Array([0x00, 0xff, 0x80, 0x41]);

      fs.writeFileSync(path.join(outputDir, "binary.dat"), bytes);

      const artifacts = await readBuildArtifacts(outputDir);

      expect(artifacts).toHaveLength(1);

      const artifact = artifacts[0]!;

      expect(artifact.path).toBe("binary.dat");
      expect(artifact.content).toBeInstanceOf(Uint8Array);

      if (typeof artifact.content === "string") {
        throw new Error("Expected binary artifact content");
      }

      expect(Array.from(artifact.content)).toStrictEqual(Array.from(bytes));
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject missing output directory", async () => {
    const outputDir = path.join(os.tmpdir(), `vegas-missing-${crypto.randomUUID()}`);

    await expect(readBuildArtifacts(outputDir)).rejects.toThrow(
      `Build output directory not found: ${outputDir}`,
    );
  });

  test("reject output path that is not a directory", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));
    const outputPath = path.join(root, "dist");

    try {
      fs.writeFileSync(outputPath, "not a directory");

      await expect(readBuildArtifacts(outputPath)).rejects.toThrow(
        `Build output directory not found: ${outputPath}`,
      );
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
