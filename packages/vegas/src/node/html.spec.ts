import { describe, expect, test } from "vitest";

import { HtmlDocument } from "./html";

describe("HtmlDocument", () => {
  test("create empty html document", () => {
    const document = new HtmlDocument();

    expect(document.toString()).toBe("<!DOCTYPE html><html><head></head><body></body></html>");
  });

  test("append element to head", () => {
    const document = new HtmlDocument();

    document.appendToHead("meta", {
      attributes: {
        name: "viewport",
        content: "width=device-width,initial-scale=1.0",
      },
    });
    document.appendToHead("title", { text: "vegas title" });

    expect(document.toString()).toBe(
      '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>vegas title</title></head><body></body></html>',
    );
  });

  test("append element to body", () => {
    const document = new HtmlDocument();

    document.appendToBody("div", {
      attributes: { id: "root" },
    });
    document.appendToBody("script", {
      text: 'console.log("Hello, world!");',
      attributes: { type: "module" },
    });

    expect(document.toString()).toBe(
      '<!DOCTYPE html><html><head></head><body><div id="root"></div><script type="module">console.log("Hello, world!");</script></body></html>',
    );
  });

  test("escape text content", () => {
    const document = new HtmlDocument();

    document.appendToBody("div", { text: "<hello> & goodbye" });

    expect(document.toString()).toContain("&lt;hello&gt; &amp; goodbye");
  });
});
