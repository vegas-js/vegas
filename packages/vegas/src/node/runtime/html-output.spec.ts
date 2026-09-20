import { describe, expect, test } from "vitest";

import type { BlobConverter } from "./blob-converter";
import {
  HtmlOutput,
  HtmlOutputMetaTag,
  HtmlTemplate,
  RuntimeBlob,
  serializeHtmlOutput,
} from "./index";

describe("HtmlOutput", () => {
  test("hold and mutate trusted HTML content with chaining", () => {
    const output = new HtmlOutput("<b>Hello</b>");

    expect(output.append("<p>Vegas</p>")).toBe(output);
    expect(output.getContent()).toBe("<b>Hello</b><p>Vegas</p>");

    expect(output.clear()).toBe(output);
    expect(output.getContent()).toBe("");

    expect(output.setContent("<main>Local Runtime</main>")).toBe(output);
    expect(output.getContent()).toBe("<main>Local Runtime</main>");
  });

  test("append untrusted HTML with contextual escaping", () => {
    const output = new HtmlOutput("<b>Hello, world!</b>");

    expect(output.appendUntrusted("<p>Hello again, world.</p>")).toBe(output);
    expect(output.getContent()).toBe("<b>Hello, world!</b>&lt;p&gt;Hello again, world.&lt;/p&gt;");
  });

  test("create a template backed by current HtmlOutput content", () => {
    const output = new HtmlOutput("<b>Hello</b>");
    const template = output.asTemplate();

    expect(template).toBeInstanceOf(HtmlTemplate);
    expect(template.getRawContent()).toBe("<b>Hello</b>");

    output.append("<p>Vegas</p>");
    expect(template.getRawContent()).toBe("<b>Hello</b><p>Vegas</p>");

    output.setContent("<main>Local Runtime</main>");
    expect(template.getRawContent()).toBe("<main>Local Runtime</main>");

    output.clear();
    expect(template.getRawContent()).toBe("");
  });

  test("create an independent HTML Blob from current content", () => {
    const output = new HtmlOutput("<main>Vegas 日本</main>");
    const blob = output.getBlob();

    expect(blob).toBeInstanceOf(RuntimeBlob);
    expect(blob.getDataAsString()).toBe("<main>Vegas 日本</main>");
    expect(blob.getContentType()).toBe("text/html");
    expect(blob.getName()).toBeNull();

    blob.setDataFromString("changed");
    output.setContent("<main>Updated</main>");

    expect(blob.getDataAsString()).toBe("changed");
    expect(output.getContent()).toBe("<main>Updated</main>");
    expect(output.getBlob().getDataAsString()).toBe("<main>Updated</main>");
  });

  test("convert current HTML content through the bound Blob converter", () => {
    const convert: BlobConverter = (value, contentType) => ({
      ...value,
      bytes: [80, 68, 70],
      contentType,
    });
    const output = new HtmlOutput("<main>Vegas</main>", false, undefined, convert);

    const converted = output.getAs("application/pdf");

    expect(converted).toBeInstanceOf(RuntimeBlob);
    expect(converted.getBytes()).toStrictEqual([80, 68, 70]);
    expect(converted.getContentType()).toBe("application/pdf");
  });

  test("reject conversion without a bound Runtime conversion context", () => {
    const output = new HtmlOutput("<main>Vegas</main>");

    expect(() => output.getAs("application/pdf")).toThrow(
      "HtmlOutput Blob conversion is not available in this Runtime context.",
    );
  });

  test("store meta tags as HtmlOutputMetaTag objects", () => {
    const output = new HtmlOutput();

    expect(output.addMetaTag("viewport", "width=device-width, initial-scale=1")).toBe(output);

    const tags = output.getMetaTags();

    expect(tags).toHaveLength(1);
    expect(tags[0]).toBeInstanceOf(HtmlOutputMetaTag);
    expect(tags[0].getName()).toBe("viewport");
    expect(tags[0].getContent()).toBe("width=device-width, initial-scale=1");

    tags.length = 0;
    expect(output.getMetaTags()).toHaveLength(1);
  });

  test("store title and favicon metadata with chaining", () => {
    const output = new HtmlOutput();

    expect(output.setTitle("Vegas")).toBe(output);
    expect(output.setFaviconUrl("https://example.com/favicon.png")).toBe(output);

    expect(output.getTitle()).toBe("Vegas");
    expect(output.getFaviconUrl()).toBe("https://example.com/favicon.png");
  });

  test("store initial dialog dimensions with chaining", () => {
    const output = new HtmlOutput();

    expect(output.setHeight(320)).toBe(output);
    expect(output.setWidth(480)).toBe(output);

    expect(output.getHeight()).toBe(320);
    expect(output.getWidth()).toBe(480);

    expect(output.setHeight(null)).toBe(output);
    expect(output.setWidth(null)).toBe(output);

    expect(output.getHeight()).toBeNull();
    expect(output.getWidth()).toBeNull();
  });

  test("use DEFAULT X-Frame-Options mode until explicitly changed", () => {
    const output = new HtmlOutput("<main>Vegas</main>");

    expect(serializeHtmlOutput(output).xFrameOptionsMode).toBe("DEFAULT");

    expect(output.setXFrameOptionsMode("ALLOWALL")).toBe(output);
    expect(serializeHtmlOutput(output).xFrameOptionsMode).toBe("ALLOWALL");
  });

  test("treat setSandboxMode as a no-op and expose a transport-safe snapshot", () => {
    const output = new HtmlOutput("<main>Vegas</main>")
      .addMetaTag("viewport", "width=device-width")
      .setTitle("Vegas")
      .setFaviconUrl("https://example.com/favicon.png")
      .setXFrameOptionsMode("ALLOWALL");

    expect(output.setSandboxMode("IFRAME")).toBe(output);
    expect(serializeHtmlOutput(output)).toStrictEqual({
      content: "<main>Vegas</main>",
      faviconUrl: "https://example.com/favicon.png",
      metaTags: [
        {
          name: "viewport",
          content: "width=device-width",
        },
      ],
      title: "Vegas",
      xFrameOptionsMode: "ALLOWALL",
    });
  });
});
