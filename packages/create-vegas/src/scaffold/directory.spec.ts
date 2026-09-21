import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { inspectScaffoldDirectory } from "./directory";

const tempDirs: string[] = [];

function createTempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "create-vegas-directory-"));
  tempDirs.push(directory);

  return directory;
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    fs.rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
});

describe("inspectScaffoldDirectory", () => {
  test("return missing for nonexistent path", () => {
    const root = createTempDir();
    const directory = path.join(root, "project");

    expect(inspectScaffoldDirectory(directory)).toBe("missing");
  });

  test("return empty for empty directory", () => {
    const directory = createTempDir();

    expect(inspectScaffoldDirectory(directory)).toBe("empty");
  });

  test("return non-empty for directory containing files", () => {
    const directory = createTempDir();

    fs.writeFileSync(path.join(directory, "existing.txt"), "existing");

    expect(inspectScaffoldDirectory(directory)).toBe("non-empty");
  });

  test("return invalid for file", () => {
    const root = createTempDir();
    const file = path.join(root, "project");

    fs.writeFileSync(file, "existing");

    expect(inspectScaffoldDirectory(file)).toBe("invalid");
  });
});
