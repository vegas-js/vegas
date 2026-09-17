import { describe, expect, test } from "vitest";

import { HtmlOutput, HtmlOutputMetaTag, serializeHtmlOutput } from "./index";

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
