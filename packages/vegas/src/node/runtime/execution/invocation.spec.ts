import { describe, expect, test, vi } from "vitest";

import { invokeFunction, invokeScriptFunction } from "./invocation";

describe("invokeFunction", () => {
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
});

describe("invokeScriptFunction", () => {
  test("call a function with a specified name", async () => {
    const func = vi.fn();
    await invokeScriptFunction({ func }, "func", []);

    expect(func).toHaveBeenCalledOnce();
  });

  test("forward args as-is", async () => {
    const func = vi.fn();
    await invokeScriptFunction({ func }, "func", ["arg1", "arg2"]);

    expect(func).toHaveBeenCalledWith("arg1", "arg2");
  });

  test("return an async result", async () => {
    async function func() {
      return "value";
    }
    const result = await invokeScriptFunction({ func }, "func", []);

    expect(result).toBe("value");
  });

  test("return an error when non-existent function name", async () => {
    function func() {
      return "value";
    }

    await expect(invokeScriptFunction({ func }, "function", [])).rejects.toThrow(
      "function is not a function",
    );
  });

  test("return an error when target is not a function", async () => {
    await expect(invokeScriptFunction({ value: "not a function" }, "value", [])).rejects.toThrow(
      "value is not a function",
    );
  });
});
