import { describe, expect, test } from "vitest";

import { ContentService, createContentService, TextOutput } from "./index";

describe("ContentService", () => {
  test("expose ContentService MimeType values", () => {
    const service = createContentService();

    expect(service).toBeInstanceOf(ContentService);
    expect(service.MimeType).toStrictEqual({
      ATOM: "ATOM",
      CSV: "CSV",
      ICAL: "ICAL",
      JAVASCRIPT: "JAVASCRIPT",
      JSON: "JSON",
      RSS: "RSS",
      TEXT: "TEXT",
      VCARD: "VCARD",
      XML: "XML",
    });
  });

  test("create TextOutput with optional content", () => {
    const service = createContentService();

    const emptyOutput = service.createTextOutput();
    const contentOutput = service.createTextOutput("Vegas");

    expect(emptyOutput).toBeInstanceOf(TextOutput);
    expect(emptyOutput.getContent()).toBe("");

    expect(contentOutput).toBeInstanceOf(TextOutput);
    expect(contentOutput.getContent()).toBe("Vegas");
  });
});
