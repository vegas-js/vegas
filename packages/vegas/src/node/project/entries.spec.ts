import path from "node:path";

import { describe, expect, test } from "vitest";

import { createClientModuleEntries } from "./entries";

const fsRoot = path.parse(process.cwd()).root;
const clientDir = path.join(fsRoot, "home", "user", "project", "src", "client");

describe("createClientModuleEntries", () => {
  test("create client module entries", () => {
    const sources = [
      path.join(clientDir, "main.tsx"),
      path.join(clientDir, "helper.ts"),
      path.join(clientDir, "admin", "main.ts"),
      path.join(clientDir, "admin", "settings", "main.tsx"),
    ];

    const entries = createClientModuleEntries(clientDir, sources);

    expect(entries).toStrictEqual([
      {
        id: "admin",
        sourcePath: path.join(clientDir, "admin", "main.ts"),
        htmlPath: "admin.html",
      },
      {
        id: "admin/settings",
        sourcePath: path.join(clientDir, "admin", "settings", "main.tsx"),
        htmlPath: "admin/settings.html",
      },
      {
        id: "index",
        sourcePath: path.join(clientDir, "main.tsx"),
        htmlPath: "index.html",
      },
    ]);
  });

  test("identify client entries independently of source extension", () => {
    const sources = [
      path.join(clientDir, "main.js"),
      path.join(clientDir, "helper.js"),
      path.join(clientDir, "admin", "main.jsx"),
    ];

    expect(createClientModuleEntries(clientDir, sources)).toStrictEqual([
      {
        id: "admin",
        sourcePath: path.join(clientDir, "admin", "main.jsx"),
        htmlPath: "admin.html",
      },
      {
        id: "index",
        sourcePath: path.join(clientDir, "main.js"),
        htmlPath: "index.html",
      },
    ]);
  });

  test("reject duplicate client entry", () => {
    const sources = [
      path.join(clientDir, "admin", "main.ts"),
      path.join(clientDir, "admin", "main.tsx"),
    ];

    expect(() => createClientModuleEntries(clientDir, sources)).toThrow(
      "Duplicate client module entry: admin",
    );
  });
});
