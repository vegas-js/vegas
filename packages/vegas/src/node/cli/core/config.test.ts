import path from "path";

import { describe, expect, test } from "vitest";

import { UserConfig } from "../../../shared/config";
import { resolveConfig } from "./config";

describe("resolveConfig", () => {
  test("return object", () => {
    const resolvedConfig = resolveConfig({});

    expect(resolvedConfig).toBeTypeOf("object");
  });
  test("return object with default value", () => {
    const resolvedConfig = resolveConfig({});
    const expectObject: UserConfig = {
      root: ".",
      plugins: [],
      clientDir: path.join(process.cwd(), "src", "client"),
      serverDir: path.join(process.cwd(), "src", "server"),
      gasMockDir: path.join(process.cwd(), "mock"),
      output: {
        dir: path.join(process.cwd(), "dist"),
      },
      appType: "spa",
      gas: {
        dependencies: undefined,
        exceptionLogging: "STACKDRIVER",
        oauthScopes: undefined,
        runtimeVersion: "V8",
        timeZone: "UTC",
        webapp: {
          access: "MYSELF",
          executeAs: "USER_ACCESSING",
        },
      },
    };

    expect(resolvedConfig).toStrictEqual(expectObject);
  });
  test("return object with overrided config", () => {
    const dummyPlugin = { name: "dummy" };
    const resolvedConfig = resolveConfig({
      root: "__",
      plugins: [dummyPlugin],
      clientDir: path.join(process.cwd(), "src", "overrideclient"),
      serverDir: path.join(process.cwd(), "src", "overrideserver"),
      gasMockDir: path.join(process.cwd(), "overridemock"),
      output: {
        dir: path.join(process.cwd(), "overridedist"),
      },
      appType: "script",
      gas: {
        dependencies: {},
        exceptionLogging: "NONE",
        oauthScopes: [],
        runtimeVersion: "STABLE",
        timeZone: "America/New_York",
        webapp: {
          access: "ANYONE",
          executeAs: "USER_DEPLOYING",
        },
      },
    });
    const expectObject: UserConfig = {
      root: "__",
      plugins: [dummyPlugin],
      clientDir: path.join(process.cwd(), "src", "overrideclient"),
      serverDir: path.join(process.cwd(), "src", "overrideserver"),
      gasMockDir: path.join(process.cwd(), "overridemock"),
      output: {
        dir: path.join(process.cwd(), "overridedist"),
      },
      appType: "script",
      gas: {
        dependencies: {},
        exceptionLogging: "NONE",
        oauthScopes: [],
        runtimeVersion: "STABLE",
        timeZone: "America/New_York",
        webapp: {
          access: "ANYONE",
          executeAs: "USER_DEPLOYING",
        },
      },
    };

    expect(resolvedConfig).toStrictEqual(expectObject);
  });
});
