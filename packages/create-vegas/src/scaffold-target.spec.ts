import path from "node:path";

import { describe, expect, test } from "vitest";

import { resolveScaffoldTarget } from "./scaffold-target";

const fsRoot = path.parse(process.cwd()).root;
const cwd = path.join(fsRoot, "home", "user");

describe("resolveScaffoldTarget", () => {
  test("resolve relative directory from cwd", () => {
    const target = resolveScaffoldTarget(cwd, "my-app", "my-app");

    expect(target).toStrictEqual({
      directory: path.join(cwd, "my-app"),
      packageName: "my-app",
    });
  });

  test("preserve absolute directory", () => {
    const directory = path.join(fsRoot, "tmp", "my-app");

    const target = resolveScaffoldTarget(cwd, directory, "my-app");

    expect(target.directory).toBe(directory);
  });

  test("preserve dots in directory name", () => {
    const target = resolveScaffoldTarget(cwd, "my.app", "my-app");

    expect(target.directory).toBe(path.join(cwd, "my.app"));
  });

  test("resolve parent-relative directory normally", () => {
    const target = resolveScaffoldTarget(cwd, "../my-app", "my-app");

    expect(target.directory).toBe(path.resolve(cwd, "../my-app"));
  });

  test("preserve package name", () => {
    const target = resolveScaffoldTarget(cwd, "project", "@example/my-app");

    expect(target.packageName).toBe("@example/my-app");
  });
});
