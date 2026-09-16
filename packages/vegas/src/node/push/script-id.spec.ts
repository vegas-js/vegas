import { describe, expect, test } from "vitest";

import { AppsScriptPushPrerequisiteError } from "./error";
import { resolveAppsScriptScriptId } from "./script-id";

describe("resolveAppsScriptScriptId", () => {
  test("prefer environment script id", () => {
    expect(
      resolveAppsScriptScriptId({
        environmentScriptId: "environment-id",
        projectScriptId: "project-id",
        compatibilityScriptId: "compatibility-id",
      }),
    ).toBe("environment-id");
  });

  test("prefer project script id over compatibility script id", () => {
    expect(
      resolveAppsScriptScriptId({
        projectScriptId: "project-id",
        compatibilityScriptId: "compatibility-id",
      }),
    ).toBe("project-id");
  });

  test("use compatibility script id", () => {
    expect(
      resolveAppsScriptScriptId({
        compatibilityScriptId: "compatibility-id",
      }),
    ).toBe("compatibility-id");
  });

  test("reject missing script id", () => {
    expect(() => resolveAppsScriptScriptId({})).toThrow(AppsScriptPushPrerequisiteError);
    expect(() => resolveAppsScriptScriptId({})).toThrow(
      "Apps Script script ID is required. Set appsScript.scriptId in vegas.config.ts or VEGAS_SCRIPT_ID. .clasp.json is used only when neither is defined.",
    );
  });

  test("reject empty environment script id instead of falling back", () => {
    expect(() =>
      resolveAppsScriptScriptId({
        environmentScriptId: "",
        compatibilityScriptId: "compatibility-id",
      }),
    ).toThrow("Apps Script script ID is required.");
  });

  test("reject empty project script id instead of falling back", () => {
    expect(() =>
      resolveAppsScriptScriptId({
        projectScriptId: "",
        compatibilityScriptId: "compatibility-id",
      }),
    ).toThrow("Apps Script script ID is required.");
  });

  test("reject empty compatibility script id", () => {
    expect(() =>
      resolveAppsScriptScriptId({
        compatibilityScriptId: "",
      }),
    ).toThrow("Apps Script script ID is required.");
  });

  test("preserve script id", () => {
    expect(
      resolveAppsScriptScriptId({
        environmentScriptId: " script-id ",
      }),
    ).toBe(" script-id ");
  });
});
