import { describe, expect, test } from "vitest";

import {
  defineConfig,
  type AppsScriptConfig,
  type AppsScriptManifest,
  type UserConfig,
} from "./config";

describe("defineConfig", () => {
  test("returns the user config unchanged", () => {
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
});
