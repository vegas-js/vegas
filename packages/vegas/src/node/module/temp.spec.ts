import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { DisposableTempDir } from "./temp";

describe("DisposableTempDir", () => {
  test("create temp directory in node_modules", () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const nodeModulesPath = path.join(tempDirPath, "node_modules");
      fs.mkdirSync(nodeModulesPath);

      using tempDir = new DisposableTempDir("test", tempDirPath);

      expect(tempDir.getPath().startsWith(path.join(nodeModulesPath, "test-"))).toBe(true);
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("create temp directory in system temp directory when node_modules does not exist", () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      using tempDir = new DisposableTempDir("test", tempDirPath);

      expect(tempDir.getPath().startsWith(path.join(os.tmpdir(), "test-"))).toBe(true);
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test.each(["/", "./", "../", ""])("use safe prefix for name: %j", (name) => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const nodeModulesPath = path.join(tempDirPath, "node_modules");
      fs.mkdirSync(nodeModulesPath);
      using tempDir = new DisposableTempDir(name, tempDirPath);

      expect(tempDir.getPath().startsWith(path.join(nodeModulesPath, "temp-"))).toBe(true);
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("delete temp directory", () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      fs.mkdirSync(path.join(tempDirPath, "node_modules"));
      const tempDir = new DisposableTempDir("test", tempDirPath);
      const createdPath = tempDir.getPath();

      expect(fs.existsSync(createdPath)).toBe(true);

      tempDir.delete();

      expect(fs.existsSync(createdPath)).toBe(false);
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("delete temp directory when disposed", () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      fs.mkdirSync(path.join(tempDirPath, "node_modules"));
      let createdPath: string;

      {
        using tempDir = new DisposableTempDir("test", tempDirPath);
        createdPath = tempDir.getPath();

        expect(fs.existsSync(createdPath)).toBe(true);
      }

      expect(fs.existsSync(createdPath)).toBe(false);
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });
});
