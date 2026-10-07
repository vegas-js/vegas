import { describe, expect, test } from "vitest";

import { createAppsScriptDoGetEvent, createAppsScriptDoPostEvent } from "./event";

describe("createAppsScriptDoGetEvent", () => {
  test("create event from webapp url", () => {
    const event = createAppsScriptDoGetEvent(
      new URL("http://localhost:5173/dev/hello?name=alice&n=1&n=2"),
    );

    expect(event).toStrictEqual({
      queryString: "name=alice&n=1&n=2",
      parameter: {
        name: "alice",
        n: "1",
      },
      parameters: {
        name: ["alice"],
        n: ["1", "2"],
      },
      pathInfo: "hello",
      contextPath: "",
      contentLength: -1,
    });
  });

  test("use null when query string is absent", () => {
    const event = createAppsScriptDoGetEvent(new URL("http://localhost:5173/dev"));

    expect(event).toStrictEqual({
      queryString: null,
      parameter: {},
      parameters: {},
      contextPath: "",
      contentLength: -1,
    });
  });

  test("decode request parameters", () => {
    const event = createAppsScriptDoGetEvent(
      new URL("http://localhost:5173/dev?name=Alice+Smith&value=a%3Db%26c"),
    );

    expect(event.queryString).toBe("name=Alice+Smith&value=a%3Db%26c");
    expect(event.parameter).toStrictEqual({
      name: "Alice Smith",
      value: "a=b&c",
    });
    expect(event.parameters).toStrictEqual({
      name: ["Alice Smith"],
      value: ["a=b&c"],
    });
  });

  test("use first value for repeated parameter", () => {
    const event = createAppsScriptDoGetEvent(new URL("http://localhost:5173/dev?n=&n=2"));

    expect(event.parameter).toStrictEqual({ n: "" });
    expect(event.parameters).toStrictEqual({ n: ["", "2"] });
  });

  test("omit path info when path does not follow endpoint", () => {
    const event = createAppsScriptDoGetEvent(new URL("http://localhost:5173/dev"));

    expect(event.pathInfo).toBeUndefined();
  });
});

describe("createAppsScriptDoPostEvent", () => {
  test("create event with post data", () => {
    const event = createAppsScriptDoPostEvent(
      new URL("http://localhost:5173/exec?name=alice"),
      "hello",
      "text/plain; charset=utf-8",
    );

    expect(event).toStrictEqual({
      queryString: "name=alice",
      parameter: {
        name: "alice",
      },
      parameters: {
        name: ["alice"],
      },
      contextPath: "",
      contentLength: 5,
      postData: {
        length: 5,
        type: "text/plain",
        contents: "hello",
        name: "postData",
      },
    });
  });

  test("count post body length in bytes", () => {
    const event = createAppsScriptDoPostEvent(
      new URL("http://localhost:5173/dev"),
      "あ",
      "text/plain",
    );

    expect(event.contentLength).toBe(3);
    expect(event.postData.length).toBe(3);
  });
});
