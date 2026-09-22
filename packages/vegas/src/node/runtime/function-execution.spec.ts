import { describe, expect, test } from "vitest";

import { executeRuntimeFunction, HtmlOutput, TextOutput } from "./index";

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
      kind: "html",
      output: {
        content: "<main>Vegas</main>",
        faviconUrl: "",
        metaTags: [],
        title: "Vegas",
        xFrameOptionsMode: "ALLOWALL",
      },
    });
  });

  test("serialize doGet TextOutput results", async () => {
    function doGet() {
      return new TextOutput('{"ok":true}').setMimeType("JSON");
    }

    await expect(executeRuntimeFunction({ doGet }, "doGet", [])).resolves.toStrictEqual({
      kind: "text",
      output: {
        content: '{"ok":true}',
        fileName: null,
        mimeType: "JSON",
      },
    });
  });

  test("serialize doPost HtmlOutput results", async () => {
    function doPost() {
      return new HtmlOutput("<main>posted</main>");
    }

    await expect(executeRuntimeFunction({ doPost }, "doPost", [])).resolves.toStrictEqual({
      kind: "html",
      output: {
        content: "<main>posted</main>",
        faviconUrl: "",
        metaTags: [],
        title: "",
        xFrameOptionsMode: "DEFAULT",
      },
    });
  });

  test("serialize doPost TextOutput results", async () => {
    function doPost() {
      return new TextOutput("posted").downloadAsFile("response.txt");
    }

    await expect(executeRuntimeFunction({ doPost }, "doPost", [])).resolves.toStrictEqual({
      kind: "text",
      output: {
        content: "posted",
        fileName: "response.txt",
        mimeType: "TEXT",
      },
    });
  });

  test("reject invalid web app output values", async () => {
    function doGet() {
      return {
        getContent: () => "Vegas",
      };
    }

    await expect(executeRuntimeFunction({ doGet }, "doGet", [])).rejects.toThrow(
      "Web app functions must return an HtmlOutput or TextOutput.",
    );
  });
});
