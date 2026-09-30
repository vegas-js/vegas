import { describe, expect, test } from "vitest";

import { DEFAULT_APPS_SCRIPT_AUTH_PROFILE, requireAppsScriptAuthProfile } from "./auth-profile";

describe("Apps Script auth profile", () => {
  test("use default profile name", () => {
    expect(DEFAULT_APPS_SCRIPT_AUTH_PROFILE).toBe("default");
  });

  test("preserve profile name", () => {
    expect(requireAppsScriptAuthProfile("work")).toBe("work");
  });

  test("reject empty profile", () => {
    expect(() => requireAppsScriptAuthProfile("")).toThrow("Apps Script auth profile is required.");
  });

  test("reject whitespace-only profile", () => {
    expect(() => requireAppsScriptAuthProfile("   ")).toThrow(
      "Apps Script auth profile is required.",
    );
  });
});
