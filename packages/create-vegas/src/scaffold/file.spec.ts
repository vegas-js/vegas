import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { finalizeScaffoldFile, inspectScaffoldFileState } from "./file";

const tempDirs: string[] = [];

function createTempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "create-vegas-file-"));

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

describe("finalizeScaffoldFile", () => {
  test("rename file created by scaffold", () => {
    const directory = createTempDir();
    const source = path.join(directory, "_gitignore");
    const destination = path.join(directory, ".gitignore");
    const before = inspectScaffoldFileState(source, destination);

    fs.writeFileSync(source, "template");

    finalizeScaffoldFile(source, destination, before);

    expect(fs.existsSync(source)).toBe(false);
    expect(fs.readFileSync(destination, "utf8")).toBe("template");
  });

  test("preserve existing destination", () => {
    const directory = createTempDir();
    const source = path.join(directory, "_gitignore");
    const destination = path.join(directory, ".gitignore");

    fs.writeFileSync(destination, "existing");

    const before = inspectScaffoldFileState(source, destination);

    fs.writeFileSync(source, "template");

    finalizeScaffoldFile(source, destination, before);

    expect(fs.existsSync(source)).toBe(false);
    expect(fs.readFileSync(destination, "utf8")).toBe("existing");
  });

  test("preserve existing source", () => {
    const directory = createTempDir();
    const source = path.join(directory, "_gitignore");
    const destination = path.join(directory, ".gitignore");

    fs.writeFileSync(source, "existing");

    const before = inspectScaffoldFileState(source, destination);

    finalizeScaffoldFile(source, destination, before);

    expect(fs.readFileSync(source, "utf8")).toBe("existing");
    expect(fs.existsSync(destination)).toBe(false);
  });

  test("do nothing when scaffold did not create source", () => {
    const directory = createTempDir();
    const source = path.join(directory, "_optional");
    const destination = path.join(directory, "optional");
    const before = inspectScaffoldFileState(source, destination);

    finalizeScaffoldFile(source, destination, before);

    expect(fs.existsSync(source)).toBe(false);
    expect(fs.existsSync(destination)).toBe(false);
  });
});
