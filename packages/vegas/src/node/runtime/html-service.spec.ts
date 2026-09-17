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
});
