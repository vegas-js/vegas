import { describe, expect, test } from "vitest";

import { createGasDoGetEvent, createGasDoPostEvent } from "./event";

describe("createGasDoGetEvent", () => {
  test("create event from webapp url", () => {
    const event = createGasDoGetEvent(
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

  test("omit path info when path does not follow endpoint", () => {
    const event = createGasDoGetEvent(new URL("http://localhost:5173/dev"));

    expect(event.pathInfo).toBeUndefined();
  });
});

describe("createGasDoPostEvent", () => {
  test("create event with post data", () => {
    const event = createGasDoPostEvent(
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
    const event = createGasDoPostEvent(new URL("http://localhost:5173/dev"), "あ", "text/plain");

    expect(event.contentLength).toBe(3);
    expect(event.postData.length).toBe(3);
  });
});
