import { describe, expect, test } from "vitest";

import { createHtmlService, HtmlOutput, HtmlService } from "./index";

describe("HtmlService", () => {
  test("expose HTML service enums", () => {
    const service = createHtmlService();

    expect(service).toBeInstanceOf(HtmlService);
    expect(service.SandboxMode).toStrictEqual({
      EMULATED: "EMULATED",
      IFRAME: "IFRAME",
      NATIVE: "NATIVE",
    });
    expect(service.XFrameOptionsMode).toStrictEqual({
      ALLOWALL: "ALLOWALL",
      DEFAULT: "DEFAULT",
    });
  });

  test("create HtmlOutput with optional string content", () => {
    const service = createHtmlService();

    const emptyOutput = service.createHtmlOutput();
    const contentOutput = service.createHtmlOutput("<main>Vegas</main>");

    expect(emptyOutput).toBeInstanceOf(HtmlOutput);
    expect(emptyOutput.getContent()).toBe("");

    expect(contentOutput).toBeInstanceOf(HtmlOutput);
    expect(contentOutput.getContent()).toBe("<main>Vegas</main>");
  });

  test("create HtmlOutput from project HTML file", () => {
    const service = createHtmlService({
      "index.html": "<main>Index</main>",
      "admin.html": "<main>Admin</main>",
    });

    const indexOutput = service.createHtmlOutputFromFile("index");
    const adminOutput = service.createHtmlOutputFromFile("admin.html");

    expect(indexOutput).toBeInstanceOf(HtmlOutput);
    expect(indexOutput.getContent()).toBe("<main>Index</main>");

    expect(adminOutput).toBeInstanceOf(HtmlOutput);
    expect(adminOutput.getContent()).toBe("<main>Admin</main>");
  });

  test("throw when project HTML file is missing", () => {
    const service = createHtmlService({
      "index.html": "<main>Index</main>",
    });

    expect(() => service.createHtmlOutputFromFile("missing")).toThrow(Error);
    expect(() => service.createHtmlOutputFromFile("missing.html")).toThrow(Error);
  });
});
