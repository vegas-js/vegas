import { describe, expect, test } from "vitest";

import { escapeHtmlContextually } from "./html-contextual-escape";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

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
    expect(() => escapeHtmlContextually('<a href="', "java\u007fscript:alert(1)")).toThrow(
      "Cannot append an unsafe URL scheme inside the href attribute.",
    );
  });

  test("fail closed for nested executable attribute contexts", () => {
    expect(() => escapeHtmlContextually('<button onclick="', "alert(1)")).toThrow(
      UnsupportedRuntimeOperationError,
    );
    expect(() => escapeHtmlContextually('<div style="', "color:red")).toThrow(
      UnsupportedRuntimeOperationError,
    );
    expect(() => escapeHtmlContextually('<iframe srcdoc="', "<script></script>")).toThrow(
      UnsupportedRuntimeOperationError,
    );
    expect(() => escapeHtmlContextually('<button onclick="', "alert(1)")).toThrow(
      "Local Runtime does not support HtmlOutput.appendUntrusted(): contextual escaping inside the onclick attribute is not implemented.",
    );
  });

  test("fail closed for script and style content until their nested languages are modeled", () => {
    expect(() => escapeHtmlContextually("<script>const value = ", "user")).toThrow(
      UnsupportedRuntimeOperationError,
    );
    expect(() => escapeHtmlContextually("<style>.value { color: ", "red")).toThrow(
      UnsupportedRuntimeOperationError,
    );
    expect(() => escapeHtmlContextually("<script>const value = ", "user")).toThrow(
      "Local Runtime does not support HtmlOutput.appendUntrusted(): contextual escaping inside <script> content is not implemented.",
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
