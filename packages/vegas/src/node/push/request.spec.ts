import { describe, expect, test } from "vitest";

import type { AppsScriptProjectContent } from "./content";
import { createAppsScriptPushRequest } from "./request";

describe("createAppsScriptPushRequest", () => {
  test("create push request", () => {
    const content: AppsScriptProjectContent = {
      files: [
        {
          name: "Code",
          type: "SERVER_JS",
          source: "function hello() {}",
        },
        {
          name: "appsscript",
          type: "JSON",
          source: "{}",
        },
      ],
    };

    expect(createAppsScriptPushRequest("script-id", content)).toStrictEqual({
      scriptId: "script-id",
      content,
    });
  });

  test("reject empty script id", () => {
    expect(() =>
      createAppsScriptPushRequest("", {
        files: [],
      }),
    ).toThrow("Apps Script script ID is required.");
  });

  test("reject whitespace-only script id", () => {
    expect(() =>
      createAppsScriptPushRequest("   ", {
        files: [],
      }),
    ).toThrow("Apps Script script ID is required.");
  });

  test("preserve script id", () => {
    const content: AppsScriptProjectContent = {
      files: [],
    };

    const request = createAppsScriptPushRequest(" script-id ", content);

    expect(request.scriptId).toBe(" script-id ");
  });
});
