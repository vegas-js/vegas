import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { DisposableTempDir } from "./fs";

test("the temp directory path is generated.", () => {
  const name = "test";
  const tempDir = new DisposableTempDir(name);

  const expectTempPath = path.join(process.cwd(), "node_modules", "test-");

  expect(tempDir.getPath().startsWith(expectTempPath)).toBe(true);
});

describe("temp directory paths are generated safely.", () => {
  test("root specification", () => {
    const name = "/";
    const tempDir = new DisposableTempDir(name);

    const expectTempPath = path.join(process.cwd(), "node_modules", "temp-");

    expect(tempDir.getPath().startsWith(expectTempPath)).toBe(true);
  });
  test("current reference specification.", () => {
    const name = "./";
    const tempDir = new DisposableTempDir(name);

    const expectTempPath = path.join(process.cwd(), "node_modules", "temp-");

    expect(tempDir.getPath().startsWith(expectTempPath)).toBe(true);
  });
  test("relative reference specification.", () => {
    const name = "../";
    const tempDir = new DisposableTempDir(name);

    const expectTempPath = path.join(process.cwd(), "node_modules", "temp-");

    expect(tempDir.getPath().startsWith(expectTempPath)).toBe(true);
  });
  test("empty name specification.", () => {
    const name = "";
    const tempDir = new DisposableTempDir(name);

    const expectTempPath = path.join(process.cwd(), "node_modules", "temp-");

    expect(tempDir.getPath().startsWith(expectTempPath)).toBe(true);
  });
});

test("a temp directory is created and can be deleted with delete.", () => {
  const name = "test";
  const tempDir = new DisposableTempDir(name);

  expect(fs.existsSync(tempDir.getPath())).toBe(true);

  tempDir.delete();
  expect(fs.existsSync(tempDir.getPath())).toBe(false);
});

test("a temp directory is created and deleted when the using scope ends.", () => {
  const name = "test";
  let tempDirPath = "";
  {
    using tempDir = new DisposableTempDir(name);
    tempDirPath = tempDir.getPath();
    expect(fs.existsSync(tempDir.getPath())).toBe(true);
  }

  expect(fs.existsSync(tempDirPath)).toBe(false);
});
