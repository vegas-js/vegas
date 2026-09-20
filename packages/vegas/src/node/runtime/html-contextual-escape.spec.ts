import { describe, expect, test } from "vitest";

import { escapeHtmlContextually } from "./html-contextual-escape";

describe("escapeHtmlContextually", () => {
  test("escape markup in HTML text", () => {
    expect(escapeHtmlContextually("<b>Hello</b>", '<p title="x">&</p>')).toBe(
      '&lt;p title="x"&gt;&amp;&lt;/p&gt;',
    );
  });

  test("escape quoted and unquoted attribute values", () => {
    expect(escapeHtmlContextually('<div title="Vegas ', '" onclick="evil">')).toBe(
      "&quot; onclick=&quot;evil&quot;&gt;",
    );
    expect(escapeHtmlContextually("<div data-value=", "hello world>")).toBe("hello&#32;world&gt;");
  });

  test("allow safe URL schemes and relative URLs", () => {
    expect(escapeHtmlContextually('<a href="', "https://example.com/?a=1&b=2")).toBe(
      "https://example.com/?a=1&amp;b=2",
    );
    expect(escapeHtmlContextually('<a href="/users/', "alice?tab=1&sort=name")).toBe(
      "alice?tab=1&amp;sort=name",
    );
  });

  test("reject dangerous URL schemes", () => {
    expect(() => escapeHtmlContextually('<a href="', "java\nscript:alert(1)")).toThrow(
      "Cannot append an unsafe URL scheme inside the href attribute.",
    );
  });

  test("reject nested executable attribute contexts", () => {
    expect(() => escapeHtmlContextually('<button onclick="', "alert(1)")).toThrow(
      "Cannot append untrusted content inside the onclick attribute.",
    );
    expect(() => escapeHtmlContextually('<div style="', "color:red")).toThrow(
      "Cannot append untrusted content inside the style attribute.",
    );
    expect(() => escapeHtmlContextually('<iframe srcdoc="', "<script></script>")).toThrow(
      "Cannot append untrusted content inside the srcdoc attribute.",
    );
  });

  test("reject script and style content until their nested languages are modeled", () => {
    expect(() => escapeHtmlContextually("<script>const value = ", "user")).toThrow(
      "Cannot append untrusted content inside <script> content.",
    );
    expect(() => escapeHtmlContextually("<style>.value { color: ", "red")).toThrow(
      "Cannot append untrusted content inside <style> content.",
    );
  });

  test("reject incomplete HTML syntax instead of guessing a safe context", () => {
    expect(() => escapeHtmlContextually("<div class", "name")).toThrow(
      "Cannot append untrusted content inside an HTML attribute name.",
    );
    expect(() => escapeHtmlContextually("<!-- comment", "value")).toThrow(
      "Cannot append untrusted content inside an HTML comment.",
    );
  });
});
