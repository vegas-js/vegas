import { describe, expect, test } from "vitest";

import {
  compileHtmlTemplate,
  compileHtmlTemplateWithComments,
  parseHtmlTemplate,
} from "./html-template-compiler";

describe("HTML template compiler", () => {
  test("parse text and all scriptlet forms", () => {
    expect(
      parseHtmlTemplate('a<? const value = 1; ?>b<?= value ?>c<?!= "<b>trusted</b>" ?>d'),
    ).toStrictEqual([
      { type: "text", value: "a" },
      { type: "scriptlet", code: " const value = 1; " },
      { type: "text", value: "b" },
      { type: "print", code: " value ", escaping: "contextual" },
      { type: "text", value: "c" },
      { type: "print", code: ' "<b>trusted</b>" ', escaping: "none" },
      { type: "text", value: "d" },
    ]);
  });

  test("compile scriptlets without changing first-statement print semantics", () => {
    const code = compileHtmlTemplate('<?="first"; "second" ?>');

    expect(code).toContain('__vegasHtmlTemplateOutput.escaped = "first"; "second" ;');
  });

  test("keep following same-line output inside a scriptlet line comment", () => {
    const code = compileHtmlTemplate("<? var value = 1; // comment ?>text");

    expect(code).toContain('var value = 1; // comment ;__vegasHtmlTemplateOutput.raw = "text";');
  });

  test("compile contextual and force-print output through distinct sinks", () => {
    const code = compileHtmlTemplate("<b><?= value ?></b><?!= trusted ?>");

    expect(code).toContain('__vegasHtmlTemplateOutput.raw = "<b>";');
    expect(code).toContain("__vegasHtmlTemplateOutput.escaped =  value ;");
    expect(code).toContain('__vegasHtmlTemplateOutput.raw = "</b>";');
    expect(code).toContain("__vegasHtmlTemplateOutput.raw =  trusted ;");
  });

  test("place template source comments beside every generated line", () => {
    const code = compileHtmlTemplateWithComments("<main>\n<?= value ?>\n</main>");
    const lines = code.split("\n");

    expect(lines).toHaveLength(4);
    expect(lines[0]).toMatch(/ \/\/ 1: <main>$/);
    expect(lines[1]).toMatch(/ \/\/ 2: <\?= value \?>$/);
    expect(lines[2]).toMatch(/ \/\/ 3: <\/main>$/);
    expect(lines[3]).toContain("return __vegasHtmlTemplateOutput.finish();");
    expect(lines[3]).toMatch(/ \/\/ 3: <\/main>$/);
  });

  test("reject an unclosed scriptlet", () => {
    expect(() => compileHtmlTemplate("<main><? value")).toThrow(
      "Unclosed HTML template scriptlet at offset 6.",
    );
  });
});
