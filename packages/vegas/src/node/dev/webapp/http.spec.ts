import { describe, expect, test } from "vitest";

import { createGasDoPostHttpResponse, parseWebAppPath, readRequestBody } from "./http";

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

describe("createGasDoPostHttpResponse", () => {
  test("create response from gas result", () => {
    expect(
      createGasDoPostHttpResponse({
        mimeType: "application/json",
        content: '{"ok":true}',
      }),
    ).toStrictEqual({
      contentType: "application/json; charset=utf-8",
      body: '{"ok":true}',
    });
  });
});
