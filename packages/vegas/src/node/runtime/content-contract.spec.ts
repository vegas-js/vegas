import { describe, expect, test } from "vitest";

import { createContentService, TextOutput } from "./index";

// Public contracts:
// https://developers.google.com/apps-script/reference/content/content-service
// https://developers.google.com/apps-script/reference/content/text-output
describe("ContentService public contract", () => {
  test("create TextOutput with empty or initial content", () => {
    const service = createContentService();
    const empty = service.createTextOutput();
    const initial = service.createTextOutput("Vegas");

    expect(empty).toBeInstanceOf(TextOutput);
    expect(empty.getContent()).toBe("");
    expect(initial).toBeInstanceOf(TextOutput);
    expect(initial.getContent()).toBe("Vegas");
  });
});

describe("TextOutput public contract", () => {
  test("append, clear, replace, and read served content with chaining", () => {
    const output = createContentService().createTextOutput("Hello");

    expect(output.append(" Vegas")).toBe(output);
    expect(output.getContent()).toBe("Hello Vegas");

    expect(output.clear()).toBe(output);
    expect(output.getContent()).toBe("");

    expect(output.setContent("Local Runtime")).toBe(output);
    expect(output.getContent()).toBe("Local Runtime");
  });

  test("use plain text by default and allow changing the MIME type", () => {
    const output = createContentService().createTextOutput();

    expect(output.getMimeType()).toBe("TEXT");
    expect(output.setMimeType("JSON")).toBe(output);
    expect(output.getMimeType()).toBe("JSON");
  });

  test("set and clear the download filename with chaining", () => {
    const output = createContentService().createTextOutput();

    expect(output.getFileName()).toBeNull();
    expect(output.downloadAsFile("vegas.json")).toBe(output);
    expect(output.getFileName()).toBe("vegas.json");
    expect(output.downloadAsFile(null)).toBe(output);
    expect(output.getFileName()).toBeNull();

    // Google documents rejection of illegal filename characters but does not define that
    // character set. Vegas keeps that behavior classified as local-emulation and does not
    // claim an undocumented production-compatible validation rule here.
  });
});
