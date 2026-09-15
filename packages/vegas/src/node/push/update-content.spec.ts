import { describe, expect, test } from "vitest";

import type { AppsScriptPushRequest } from "./request";
import { createAppsScriptUpdateContentHttpRequest } from "./update-content";

describe("createAppsScriptUpdateContentHttpRequest", () => {
  test("create updateContent HTTP request", () => {
    const request: AppsScriptPushRequest = {
      scriptId: "script-id",
      content: {
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
      },
    };

    expect(createAppsScriptUpdateContentHttpRequest(request)).toStrictEqual({
      method: "PUT",
      url: "https://script.googleapis.com/v1/projects/script-id/content",
      body: request.content,
    });
  });

  test("encode script id as URL path component", () => {
    const request: AppsScriptPushRequest = {
      scriptId: "script/id?target=test",
      content: {
        files: [],
      },
    };

    expect(createAppsScriptUpdateContentHttpRequest(request).url).toBe(
      "https://script.googleapis.com/v1/projects/script%2Fid%3Ftarget%3Dtest/content",
    );
  });

  test("preserve authoritative project content", () => {
    const request: AppsScriptPushRequest = {
      scriptId: "script-id",
      content: {
        files: [
          {
            name: "appsscript",
            type: "JSON",
            source: "{}",
          },
        ],
      },
    };

    const httpRequest = createAppsScriptUpdateContentHttpRequest(request);

    expect(httpRequest.body).toBe(request.content);
  });
});
