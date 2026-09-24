import { describe, expect, test } from "vitest";

import { createBlob, createHtmlService, HtmlOutput, HtmlTemplate } from "./index";

// Public contract:
// https://developers.google.com/apps-script/reference/html/html-service
describe("HtmlService public contract", () => {
  test("create HtmlOutput from empty, string, and HTML Blob inputs", () => {
    const service = createHtmlService();
    const htmlBlob = createBlob("<main>Blob</main>", "text/html");

    expect(service.createHtmlOutput()).toBeInstanceOf(HtmlOutput);

    const stringOutput = service.createHtmlOutput("<main>Vegas</main>");
    expect(stringOutput).toBeInstanceOf(HtmlOutput);
    expect(stringOutput.getContent()).toBe("<main>Vegas</main>");

    const blobOutput = service.createHtmlOutput(htmlBlob);
    expect(blobOutput).toBeInstanceOf(HtmlOutput);
    expect(blobOutput.getContent()).toBe("<main>Blob</main>");
  });

  test("reject non-HTML Blob inputs", () => {
    const service = createHtmlService();
    const textBlob = createBlob("not html", "text/plain");

    expect(() => service.createHtmlOutput(textBlob)).toThrow(Error);
    expect(() => service.createTemplate(textBlob)).toThrow(Error);
  });

  test("create HtmlOutput from a project HTML file and reject missing files", () => {
    const service = createHtmlService({
      "index.html": "<main>Index</main>",
    });

    const output = service.createHtmlOutputFromFile("index");

    expect(output).toBeInstanceOf(HtmlOutput);
    expect(output.getContent()).toBe("<main>Index</main>");
    expect(() => service.createHtmlOutputFromFile("missing")).toThrow(Error);
  });

  test("create HtmlTemplate from string, HTML Blob, and project file inputs", () => {
    const service = createHtmlService({
      "index.html": "<main><?= value ?></main>",
    });
    const htmlBlob = createBlob("<main><?= blob ?></main>", "text/html");

    const stringTemplate = service.createTemplate("<main><?= value ?></main>");
    const blobTemplate = service.createTemplate(htmlBlob);
    const fileTemplate = service.createTemplateFromFile("index");

    expect(stringTemplate).toBeInstanceOf(HtmlTemplate);
    expect(stringTemplate.getRawContent()).toBe("<main><?= value ?></main>");
    expect(blobTemplate).toBeInstanceOf(HtmlTemplate);
    expect(blobTemplate.getRawContent()).toBe("<main><?= blob ?></main>");
    expect(fileTemplate).toBeInstanceOf(HtmlTemplate);
    expect(fileTemplate.getRawContent()).toBe("<main><?= value ?></main>");
    expect(() => service.createTemplateFromFile("missing")).toThrow(Error);
  });

  test("return the browser user agent only for web app invocations", () => {
    const webAppService = createHtmlService(
      {},
      {
        webApp: true,
        userAgent: "Vegas Browser",
      },
    );
    const scriptService = createHtmlService({}, { webApp: false });

    expect(webAppService.getUserAgent()).toBe("Vegas Browser");
    expect(scriptService.getUserAgent()).toBeNull();
  });
});
