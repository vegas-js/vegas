import { describe, expect, test } from "vitest";

import type { BlobConverter } from "./blob-converter";
import { createHtmlService, HtmlOutputMetaTag, RuntimeBlob, serializeHtmlOutput } from "./index";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

// Public contract:
// https://developers.google.com/apps-script/reference/html/html-output
describe("HtmlOutput public contract", () => {
  test("mutate trusted content and expose a live-backed template", () => {
    const output = createHtmlService().createHtmlOutput("<b>Hello</b>");

    expect(output.append("<p>Vegas</p>")).toBe(output);
    expect(output.getContent()).toBe("<b>Hello</b><p>Vegas</p>");

    const template = output.asTemplate();

    expect(template.getRawContent()).toBe("<b>Hello</b><p>Vegas</p>");

    expect(output.setContent("<main>Local Runtime</main>")).toBe(output);
    expect(template.getRawContent()).toBe("<main>Local Runtime</main>");

    expect(output.clear()).toBe(output);
    expect(output.getContent()).toBe("");
    expect(template.getRawContent()).toBe("");
  });

  test("append untrusted content with contextual escaping", () => {
    const output = createHtmlService().createHtmlOutput("<b>Hello, world!</b>");

    expect(output.appendUntrusted("<p>Hello again, world.</p>")).toBe(output);
    expect(output.getContent()).toBe("<b>Hello, world!</b>&lt;p&gt;Hello again, world.&lt;/p&gt;");
  });

  test("manage documented page metadata with chaining", () => {
    const output = createHtmlService().createHtmlOutput();
    const documentedMetaTags = [
      ["apple-mobile-web-app-capable", "yes"],
      ["google-site-verification", "token"],
      ["mobile-web-app-capable", "yes"],
      ["viewport", "width=device-width, initial-scale=1"],
    ] as const;

    for (const [name, content] of documentedMetaTags) {
      expect(output.addMetaTag(name, content)).toBe(output);
    }

    const tags = output.getMetaTags();

    expect(tags).toHaveLength(documentedMetaTags.length);
    expect(tags[0]).toBeInstanceOf(HtmlOutputMetaTag);
    expect(tags.map((tag) => [tag.getName(), tag.getContent()])).toStrictEqual(
      documentedMetaTags.map(([name, content]) => [name, content]),
    );

    expect(() => output.addMetaTag("description", "Vegas")).toThrow(
      UnsupportedRuntimeOperationError,
    );

    expect(output.setFaviconUrl("https://example.com/favicon.png")).toBe(output);
    expect(output.getFaviconUrl()).toBe("https://example.com/favicon.png");

    expect(output.setTitle("Vegas")).toBe(output);
    expect(output.getTitle()).toBe("Vegas");
  });

  test("manage dialog dimensions and ignore them for web apps", () => {
    const dialog = createHtmlService({}, { webApp: false }).createHtmlOutput();

    expect(dialog.setHeight(320)).toBe(dialog);
    expect(dialog.setWidth(480)).toBe(dialog);
    expect(dialog.getHeight()).toBe(320);
    expect(dialog.getWidth()).toBe(480);

    const webApp = createHtmlService(
      {},
      {
        webApp: true,
        userAgent: null,
      },
    ).createHtmlOutput();

    expect(webApp.setHeight(320)).toBe(webApp);
    expect(webApp.setWidth(480)).toBe(webApp);
    expect(webApp.getHeight()).toBeNull();
    expect(webApp.getWidth()).toBeNull();
  });

  test("return current output data as Blob values and convert through the Runtime converter", () => {
    const convert: BlobConverter = (value, contentType) => ({
      ...value,
      bytes: [80, 68, 70],
      contentType,
    });
    const output = createHtmlService({}, { webApp: false }, undefined, convert).createHtmlOutput(
      "<main>Vegas</main>",
    );

    const blob = output.getBlob();

    expect(blob).toBeInstanceOf(RuntimeBlob);
    expect(blob.getDataAsString()).toBe("<main>Vegas</main>");

    const converted = output.getAs("application/pdf");

    expect(converted).toBeInstanceOf(RuntimeBlob);
    expect(converted.getBytes()).toStrictEqual([80, 68, 70]);
    expect(converted.getContentType()).toBe("application/pdf");
  });

  test("keep sandbox mode as a no-op and track X-Frame-Options mode", () => {
    const output = createHtmlService().createHtmlOutput("<main>Vegas</main>");
    const beforeSandboxMode = serializeHtmlOutput(output);

    expect(output.setSandboxMode("IFRAME")).toBe(output);
    expect(serializeHtmlOutput(output)).toStrictEqual(beforeSandboxMode);
    expect(serializeHtmlOutput(output).xFrameOptionsMode).toBe("DEFAULT");

    expect(output.setXFrameOptionsMode("ALLOWALL")).toBe(output);
    expect(serializeHtmlOutput(output).xFrameOptionsMode).toBe("ALLOWALL");
  });
});
