import { describe, expect, test } from "vitest";

import {
  defineConfig,
  type AppsScriptConfig,
  type AppsScriptManifest,
  type UserConfig,
} from "./config";

describe("defineConfig", () => {
  test("return an object config unchanged", () => {
    const manifest: AppsScriptManifest = {
      runtimeVersion: "V8",
      timeZone: "Asia/Tokyo",
    };

    const appsScript: AppsScriptConfig = {
      scriptId: "script-id",
      manifest,
    };

    const config: UserConfig = {
      appType: "spa",
      appsScript,
    };

    expect(defineConfig(config)).toBe(config);
  });

  test("return a promise config unchanged", () => {
    const config = Promise.resolve<UserConfig>({ appType: "script" });

    expect(defineConfig(config)).toBe(config);
  });

  test("return a config factory unchanged", () => {
    const config = async (): Promise<UserConfig> => ({ appType: "script" });

    expect(defineConfig(config)).toBe(config);
  });
});
