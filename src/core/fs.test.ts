import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { DisposableTempDir } from "./fs";

test("the temp directory path is generated.", () => {
  const name = "test";
  const tempDir = new DisposableTempDir(name);

  const expectTempPath = `${path.join(os.tmpdir(), name)}-`;

  expect(tempDir.getPath().startsWith(expectTempPath)).toBe(true);
});

describe("temp directory paths are generated safely.", () => {
  test("root specification", () => {
    const name = "/";
    const tempDir = new DisposableTempDir(name);

    expect(tempDir.getPath().startsWith(os.tmpdir())).toBe(true);
  });
  test("relative reference specification", () => {
    const name = "../";
    const tempDir = new DisposableTempDir(name);

    expect(tempDir.getPath().startsWith(os.tmpdir())).toBe(true);
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
