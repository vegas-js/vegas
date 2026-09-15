import { describe, expect, test } from "vitest";

import { createClaspArgv, createClaspProjectConfig, parseClaspProjectConfig } from "./push";

describe("parseClaspProjectConfig", () => {
  test("parse JSON5 project config", () => {
    expect(
      parseClaspProjectConfig(`
        {
          // Apps Script project
          scriptId: 'script',
          parentId: 'parent',
        }
      `),
    ).toStrictEqual({
      scriptId: "script",
      parentId: "parent",
    });
  });
});

describe("createClaspProjectConfig", () => {
  test("create config from clasp config", () => {
    expect(
      createClaspProjectConfig(
        {
          parentId: "parent",
          scriptId: "script",
        },
        {},
        ".",
      ),
    ).toStrictEqual({
      parentId: "parent",
      scriptId: "script",
      rootDir: ".",
    });
  });

  test("override config from environment", () => {
    expect(
      createClaspProjectConfig(
        {
          parentId: "config-parent",
          scriptId: "config-script",
        },
        {
          parentId: "env-parent",
          scriptId: "env-script",
        },
        ".",
      ),
    ).toStrictEqual({
      parentId: "env-parent",
      scriptId: "env-script",
      rootDir: ".",
    });
  });

  test("preserve config when overrides are undefined", () => {
    expect(
      createClaspProjectConfig(
        {
          parentId: "parent",
          scriptId: "script",
        },
        {
          parentId: undefined,
          scriptId: undefined,
        },
        ".",
      ),
    ).toStrictEqual({
      parentId: "parent",
      scriptId: "script",
      rootDir: ".",
    });
  });

  test("use provided root directory", () => {
    expect(
      createClaspProjectConfig(
        {
          scriptId: "script",
        },
        {},
        "custom-output",
      ),
    ).toStrictEqual({
      parentId: undefined,
      scriptId: "script",
      rootDir: "custom-output",
    });
  });
});

describe("createClaspArgv", () => {
  test("create push arguments with project config", () => {
    expect(
      createClaspArgv(
        ["/usr/bin/node", "/project/vegas.js", "push", "app"],
        "/app/dist/.vegas-clasp.json",
      ),
    ).toStrictEqual([
      "/usr/bin/node",
      "/project/vegas.js",
      "push",
      "--project",
      "/app/dist/.vegas-clasp.json",
    ]);
  });

  test("include explicit ignore file", () => {
    expect(
      createClaspArgv(
        ["/usr/bin/node", "/project/vegas.js", "push"],
        "/app/dist/.vegas-clasp.json",
        "/app/.claspignore",
      ),
    ).toStrictEqual([
      "/usr/bin/node",
      "/project/vegas.js",
      "push",
      "--project",
      "/app/dist/.vegas-clasp.json",
      "--ignore",
      "/app/.claspignore",
    ]);
  });
});
