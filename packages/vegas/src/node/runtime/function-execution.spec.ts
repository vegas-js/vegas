import { describe, expect, test } from "vitest";

import { executeRuntimeFunction, HtmlOutput } from "./index";

describe("executeRuntimeFunction", () => {
  test("resolve and await a named Runtime function", async () => {
    const globals = {
      async greet(name: string) {
        return `Hello ${name}`;
      },
    };

    await expect(executeRuntimeFunction(globals, "greet", ["Vegas"])).resolves.toBe("Hello Vegas");
  });

  test("reject missing Runtime functions", async () => {
    await expect(executeRuntimeFunction({}, "missing", [])).rejects.toThrow(
      "missing is not a function",
    );
  });

  test("serialize doGet HtmlOutput results", async () => {
    function doGet() {
      return new HtmlOutput("<main>Vegas</main>")
        .setTitle("Vegas")
        .setXFrameOptionsMode("ALLOWALL");
    }

    await expect(executeRuntimeFunction({ doGet }, "doGet", [])).resolves.toStrictEqual({
      content: "<main>Vegas</main>",
      faviconUrl: "",
      metaTags: [],
      title: "Vegas",
      xFrameOptionsMode: "ALLOWALL",
    });
  });

  test("serialize doPost content and MIME type", async () => {
    function doPost() {
      return {
        getContent: () => "posted",
        getMimeType: () => "text/plain",
      };
    }

    await expect(executeRuntimeFunction({ doPost }, "doPost", [])).resolves.toStrictEqual({
      mimeType: "text/plain",
      content: "posted",
    });
  });

  test("preserve the existing doPost HTML MIME type fallback", async () => {
    function doPost() {
      return {
        getContent: () => "<main>posted</main>",
      };
    }

    await expect(executeRuntimeFunction({ doPost }, "doPost", [])).resolves.toStrictEqual({
      mimeType: "text/html",
      content: "<main>posted</main>",
    });
  });
});
