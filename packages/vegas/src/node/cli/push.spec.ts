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
      ),
    ).toStrictEqual({
      parentId: "parent",
      scriptId: "script",
      rootDir: "dist",
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
      ),
    ).toStrictEqual({
      parentId: "env-parent",
      scriptId: "env-script",
      rootDir: "dist",
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
      ),
    ).toStrictEqual({
      parentId: "parent",
      scriptId: "script",
      rootDir: "dist",
    });
  });
});
