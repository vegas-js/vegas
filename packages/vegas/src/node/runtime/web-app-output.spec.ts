import { describe, expect, test } from "vitest";

import { HtmlOutput, serializeWebAppOutput, TextOutput } from "./index";

describe("serializeWebAppOutput", () => {
  test("serialize HtmlOutput with an explicit output kind", () => {
    const output = new HtmlOutput("<main>Vegas</main>")
      .setTitle("Vegas")
      .setXFrameOptionsMode("ALLOWALL");

    expect(serializeWebAppOutput(output)).toStrictEqual({
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

  test("serialize TextOutput with an explicit output kind", () => {
    const output = new TextOutput('{"ok":true}').setMimeType("JSON").downloadAsFile("vegas.json");

    expect(serializeWebAppOutput(output)).toStrictEqual({
      kind: "text",
      output: {
        content: '{"ok":true}',
        fileName: "vegas.json",
        mimeType: "JSON",
      },
    });
  });

  test("reject values that are not Apps Script web app outputs", () => {
    expect(() => serializeWebAppOutput({ getContent: () => "Vegas" })).toThrow(
      "Web app functions must return an HtmlOutput or TextOutput.",
    );
  });
});
