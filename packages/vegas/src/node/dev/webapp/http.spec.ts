import { describe, expect, test } from "vitest";

import {
  createAppsScriptDoPostHttpResponse,
  parseWebAppPath,
  readRequestBody,
  resolveAppsScriptXFrameOptionsHeader,
} from "./http";

describe("parseWebAppPath", () => {
  test("parse webapp endpoint", () => {
    expect(parseWebAppPath("/dev")).toStrictEqual({
      endpoint: "dev",
    });
    expect(parseWebAppPath("/exec/hello/world")).toStrictEqual({
      endpoint: "exec",
      pathInfo: "hello/world",
    });
  });

  test("do not match endpoint prefix", () => {
    expect(parseWebAppPath("/device")).toBeNull();
    expect(parseWebAppPath("/developer")).toBeNull();
    expect(parseWebAppPath("/execution")).toBeNull();
  });
});

describe("resolveAppsScriptXFrameOptionsHeader", () => {
  test("resolve HTML X-Frame-Options mode to host header", () => {
    expect(resolveAppsScriptXFrameOptionsHeader("DEFAULT")).toBe("SAMEORIGIN");
    expect(resolveAppsScriptXFrameOptionsHeader("ALLOWALL")).toBeUndefined();
  });
});

describe("readRequestBody", () => {
  test("decode utf-8 after collecting chunks", async () => {
    const bytes = Buffer.from("AあB");

    async function* body() {
      yield bytes.subarray(0, 2);
      yield bytes.subarray(2, 3);
      yield bytes.subarray(3);
    }

    await expect(readRequestBody(body())).resolves.toBe("AあB");
  });
});

describe("createAppsScriptDoPostHttpResponse", () => {
  test("create response from gas result", () => {
    expect(
      createAppsScriptDoPostHttpResponse({
        mimeType: "application/json",
        content: '{"ok":true}',
      }),
    ).toStrictEqual({
      contentType: "application/json; charset=utf-8",
      body: '{"ok":true}',
    });
  });
});
