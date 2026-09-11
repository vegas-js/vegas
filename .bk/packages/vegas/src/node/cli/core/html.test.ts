import { describe, expect, test } from "vitest";

import { HTML } from "./html";

test("plain html", () => {
  const html = new HTML();

  expect(html.toString()).toBe("<!DOCTYPE html><html><head></head><body></body></html>");
});

describe("html with header content", () => {
  test("with meta tag", () => {
    const html = new HTML();
    html.appendToHead("meta", [
      { name: "viewport", value: "width=device-width,initial-scale=1.0" },
    ]);

    expect(html.toString()).toBe(
      '<!DOCTYPE html><html><head><meta viewport="width=device-width,initial-scale=1.0"></head><body></body></html>',
    );
  });

  test("with title tag", () => {
    const html = new HTML();
    html.appendToHead("title", "vegas title");

    expect(html.toString()).toBe(
      "<!DOCTYPE html><html><head><title>vegas title</title></head><body></body></html>",
    );
  });

  test("with script tag", () => {
    const html = new HTML();
    html.appendToHead("script", 'console.log("Hello, world!");', [
      { name: "type", value: "module" },
      { name: "defer", value: "true" },
    ]);

    expect(html.toString()).toBe(
      '<!DOCTYPE html><html><head><script type="module" defer="true">console.log("Hello, world!");</script></head><body></body></html>',
    );
  });
});

describe("html with body content", () => {
  test("with div tag", () => {
    const html = new HTML();
    html.appendToBody("div");

    expect(html.toString()).toBe(
      "<!DOCTYPE html><html><head></head><body><div></div></body></html>",
    );
  });

  test("with div tag with attribute", () => {
    const html = new HTML();
    html.appendToBody("div", [{ name: "style", value: "background-color: #A1A2A3;" }]);

    expect(html.toString()).toBe(
      '<!DOCTYPE html><html><head></head><body><div style="background-color: #A1A2A3;"></div></body></html>',
    );
  });

  test("with div tag with content", () => {
    const html = new HTML();
    html.appendToBody("div", "Hello, world!");

    expect(html.toString()).toBe(
      "<!DOCTYPE html><html><head></head><body><div>Hello, world!</div></body></html>",
    );
  });

  test("with script tag", () => {
    const html = new HTML();
    html.appendToBody("script", 'console.log("Hello, world!");', [
      { name: "type", value: "module" },
      { name: "defer", value: "true" },
    ]);

    expect(html.toString()).toBe(
      '<!DOCTYPE html><html><head></head><body><script type="module" defer="true">console.log("Hello, world!");</script></body></html>',
    );
  });
});
