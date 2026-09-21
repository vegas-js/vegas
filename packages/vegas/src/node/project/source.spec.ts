import path from "node:path";

import { describe, expect, test } from "vitest";

import { createSourceGlobPatterns, isDeclarationSource } from "./source";

const fsRoot = path.parse(process.cwd()).root;
const root = path.join(fsRoot, "home", "user", "project");

describe("createSourceGlobPatterns", () => {
  test("create source patterns for each project source kind", () => {
    expect(createSourceGlobPatterns(path.join(root, "src", "client"), "client")).toStrictEqual([
      path.join(root, "src", "client", "**", "*.ts"),
      path.join(root, "src", "client", "**", "*.tsx"),
      path.join(root, "src", "client", "**", "*.js"),
      path.join(root, "src", "client", "**", "*.jsx"),
    ]);
    expect(createSourceGlobPatterns(path.join(root, "src", "server"), "server")).toStrictEqual([
      path.join(root, "src", "server", "**", "*.ts"),
      path.join(root, "src", "server", "**", "*.js"),
    ]);
    expect(createSourceGlobPatterns(path.join(root, "runtime"), "runtimeData")).toStrictEqual([
      path.join(root, "runtime", "**", "*.ts"),
    ]);
  });
});

describe("isDeclarationSource", () => {
  test("identify TypeScript declaration files", () => {
    expect(isDeclarationSource("types.d.ts")).toBe(true);
    expect(isDeclarationSource("types.ts")).toBe(false);
    expect(isDeclarationSource("main.tsx")).toBe(false);
  });
});
