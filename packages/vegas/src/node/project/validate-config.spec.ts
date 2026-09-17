import { describe, expect, test } from "vitest";

import { ConfigValidationError, validateUserConfig } from "./validate-config";

describe("validateUserConfig", () => {
  test("accept empty config", () => {
    const config = {};

    expect(validateUserConfig(config)).toBe(config);
  });

  test("accept valid config", () => {
    const config = {
      root: ".",
      clientDir: "src/client",
      serverDir: "src/server",
      runtimeDataDir: "runtime",
      plugins: [{ name: "plugin" }],
      appType: "spa",
      output: {
        dir: "dist",
        allowOutsideRoot: true,
      },
      appsScript: {
        scriptId: "script-id",
        manifest: {
          dependencies: {
            enabledAdvancedServices: [
              {
                serviceId: "drive",
                userSymbol: "Drive",
                version: "v3",
              },
            ],
            libraries: [
              {
                developmentMode: true,
                libraryId: "library-id",
                userSymbol: "Library",
                version: "1",
              },
            ],
          },
          exceptionLogging: "STACKDRIVER",
          oauthScopes: ["scope"],
          runtimeVersion: "V8",
          timeZone: "Asia/Tokyo",
          webapp: {
            access: "ANYONE",
            executeAs: "USER_DEPLOYING",
          },
        },
      },
    };

    expect(validateUserConfig(config)).toBe(config);
  });

  test.each([null, [], "config", 1, false])("reject non-object config: %j", (config) => {
    expect(() => validateUserConfig(config)).toThrow(
      'Invalid Vegas config: "config" must be an object.',
    );
  });

  test.each([new Date(), new Map(), new Set()])("reject non-plain config object: %j", (config) => {
    expect(() => validateUserConfig(config)).toThrow(
      'Invalid Vegas config: "config" must be an object.',
    );
  });

  test("reject unknown top-level option", () => {
    expect(() =>
      validateUserConfig({
        appTyp: "spa",
      }),
    ).toThrow('Invalid Vegas config: unknown option "appTyp".');
  });

  test("reject removed gas option", () => {
    expect(() =>
      validateUserConfig({
        gas: {},
      }),
    ).toThrow('Invalid Vegas config: unknown option "gas".');
  });

  test("reject invalid app type", () => {
    expect(() =>
      validateUserConfig({
        appType: "web",
      }),
    ).toThrow('Invalid Vegas config: "appType" must be one of "spa", "script".');
  });

  test("reject unknown nested option", () => {
    expect(() =>
      validateUserConfig({
        appsScript: {
          manifest: {
            urlFetchWhitelist: [],
          },
        },
      }),
    ).toThrow('Invalid Vegas config: unknown option "appsScript.manifest.urlFetchWhitelist".');
  });

  test("report invalid array item path", () => {
    expect(() =>
      validateUserConfig({
        appsScript: {
          manifest: {
            oauthScopes: ["scope", 1],
          },
        },
      }),
    ).toThrow('Invalid Vegas config: "appsScript.manifest.oauthScopes[1]" must be a string.');
  });

  test("accept plugin entries without interpreting them", () => {
    const plugin = {
      name: "custom",
      arbitraryPluginField: Symbol("plugin"),
    };

    const config = {
      plugins: [plugin, false, null],
    };

    expect(validateUserConfig(config)).toBe(config);
  });

  test("create ConfigValidationError", () => {
    const error = new ConfigValidationError("test.");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ConfigValidationError");
    expect(error.message).toBe("Invalid Vegas config: test.");
  });

  test("reject non-plain nested object", () => {
    expect(() =>
      validateUserConfig({
        output: new Date(),
      }),
    ).toThrow('Invalid Vegas config: "output" must be an object.');
  });

  test("reject removed gas mock directory option", () => {
    expect(() =>
      validateUserConfig({
        gasMockDir: "mock",
      }),
    ).toThrow('Invalid Vegas config: unknown option "gasMockDir".');
  });

  test("reject invalid output allow outside root", () => {
    expect(() =>
      validateUserConfig({
        output: {
          allowOutsideRoot: "yes",
        },
      }),
    ).toThrow('Invalid Vegas config: "output.allowOutsideRoot" must be a boolean.');
  });
});
