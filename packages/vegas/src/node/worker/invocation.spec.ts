import { expect, test } from "vitest";

import { invokeFunction } from "./invocation";

test("return the return value of a regular function as-is", async () => {
  function func() {
    return "value";
  }

  expect(await invokeFunction(func)).toEqual("value");
});

test("using await with async functions", async () => {
  async function func() {
    return "value";
  }

  expect(await invokeFunction(func)).toEqual("value");
});

test("serializes doGet result", async () => {
  function doGet() {
    return {
      getMetaTags: () => {
        return [{ getName: () => "charset", getContent: () => "utf-8" }];
      },
      getTitle: () => "html document",
      getFaviconUrl: () => null,
      getContent: () => "content",
      getXFrameOptionsMode: () => null,
    };
  }

  expect(await invokeFunction(doGet)).toEqual({
    metaTags: [{ name: "charset", content: "utf-8" }],
    title: "html document",
    faviconUrl: null,
    content: "content",
    xFrameOptionsMode: null,
  });
});

test("using the value of getMimeType()", async () => {
  function doPost() {
    return {
      getContent: () => "content",
      getMimeType: () => "text/javascript",
    };
  }

  expect(await invokeFunction(doPost)).toEqual({
    mimeType: "text/javascript",
    content: "content",
  });
});

test("use the default value if getMimeType() is not defined", async () => {
  function doPost() {
    return {
      getContent: () => "content",
    };
  }

  expect(await invokeFunction(doPost)).toEqual({
    mimeType: "text/html",
    content: "content",
  });
});
