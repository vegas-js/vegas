import { describe, expect, test } from "vitest";

import { resolveAppsScriptCredentialPath } from "./credential-path";

describe("resolveAppsScriptCredentialPath", () => {
  test("resolve Linux credential path from XDG_CONFIG_HOME", () => {
    expect(
      resolveAppsScriptCredentialPath({
        platform: "linux",
        homeDir: "/home/user",
        xdgConfigHome: "/config",
      }),
    ).toBe("/config/vegas/credentials.json");
  });

  test("fall back to Linux user config directory", () => {
    expect(
      resolveAppsScriptCredentialPath({
        platform: "linux",
        homeDir: "/home/user",
      }),
    ).toBe("/home/user/.config/vegas/credentials.json");
  });

  test("ignore relative XDG_CONFIG_HOME", () => {
    expect(
      resolveAppsScriptCredentialPath({
        platform: "linux",
        homeDir: "/home/user",
        xdgConfigHome: "config",
      }),
    ).toBe("/home/user/.config/vegas/credentials.json");
  });

  test("resolve macOS credential path", () => {
    expect(
      resolveAppsScriptCredentialPath({
        platform: "darwin",
        homeDir: "/Users/user",
      }),
    ).toBe("/Users/user/Library/Application Support/vegas/credentials.json");
  });

  test("resolve Windows credential path from APPDATA", () => {
    expect(
      resolveAppsScriptCredentialPath({
        platform: "win32",
        homeDir: String.raw`C:\Users\user`,
        appData: String.raw`C:\Users\user\AppData\Roaming`,
      }),
    ).toBe(String.raw`C:\Users\user\AppData\Roaming\vegas\credentials.json`);
  });

  test("fall back to Windows roaming directory", () => {
    expect(
      resolveAppsScriptCredentialPath({
        platform: "win32",
        homeDir: String.raw`C:\Users\user`,
      }),
    ).toBe(String.raw`C:\Users\user\AppData\Roaming\vegas\credentials.json`);
  });
});
