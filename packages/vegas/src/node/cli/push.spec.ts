import { describe, expect, test } from "vitest";

import { createClaspProjectConfig } from "./push";

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
