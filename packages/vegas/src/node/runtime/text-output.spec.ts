import { describe, expect, test } from "vitest";

import { TextOutput } from "./index";

describe("TextOutput", () => {
  test("hold and mutate text content with chaining", () => {
    const output = new TextOutput("Hello");

    expect(output.append(" Vegas")).toBe(output);
    expect(output.getContent()).toBe("Hello Vegas");

    expect(output.clear()).toBe(output);
    expect(output.getContent()).toBe("");

    expect(output.setContent("Local Runtime")).toBe(output);
    expect(output.getContent()).toBe("Local Runtime");
  });

  test("use TEXT mime type by default and allow changing it", () => {
    const output = new TextOutput();

    expect(output.getMimeType()).toBe("TEXT");

    expect(output.setMimeType("JSON")).toBe(output);
    expect(output.getMimeType()).toBe("JSON");
  });

  test("store an optional download filename", () => {
    const output = new TextOutput();

    expect(output.getFileName()).toBeNull();

    expect(output.downloadAsFile("vegas.json")).toBe(output);
    expect(output.getFileName()).toBe("vegas.json");

    expect(output.downloadAsFile(null)).toBe(output);
    expect(output.getFileName()).toBeNull();
  });
});
