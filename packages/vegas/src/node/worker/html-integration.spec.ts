import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { serializeHtmlOutput } from "../runtime/html-output";
import { createHtmlService } from "../runtime/html-service";
import type { Program } from "../runtime/program";

describe("worker HTML integration", () => {
  test("execute program with project HTML files and serialize HtmlOutput", () => {
    const program: Program = {
      source: `
function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Vegas")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
`,
      htmlFiles: {
        "index.html": "<main>Vegas</main>",
      },
    };
    const context = vm.createContext({
      HtmlService: createHtmlService(program.htmlFiles),
    });

    new vm.Script(program.source).runInContext(context);

    expect(serializeHtmlOutput(context.doGet())).toStrictEqual({
      content: "<main>Vegas</main>",
      faviconUrl: "",
      metaTags: [],
      title: "Vegas",
      xFrameOptionsMode: "ALLOWALL",
    });
  });
});
