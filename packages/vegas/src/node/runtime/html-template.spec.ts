import { describe, expect, test } from "vitest";

import type { HtmlTemplateEvaluator } from "./html-template";
import { HtmlOutput, HtmlTemplate } from "./index";

describe("HtmlTemplate", () => {
  test("return unprocessed template content", () => {
    const template = new HtmlTemplate("<main><?= value ?></main>");

    expect(template.getRawContent()).toBe("<main><?= value ?></main>");
  });

  test("evaluate generated code with enumerable template properties", () => {
    const evaluations: {
      readonly code: string;
      readonly bindings: Readonly<Record<string, unknown>>;
    }[] = [];
    const evaluate: HtmlTemplateEvaluator = (code, bindings) => {
      evaluations.push({ code, bindings });
      return new HtmlOutput("<main>Evaluated</main>");
    };
    const template = new HtmlTemplate("<main><?= greeting ?></main>", evaluate);
    template.greeting = "<Hello>";

    const output = template.evaluate();

    expect(output).toBeInstanceOf(HtmlOutput);
    expect(output.getContent()).toBe("<main>Evaluated</main>");
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0]?.bindings).toStrictEqual({
      greeting: "<Hello>",
    });
    expect(evaluations[0]?.code).toContain("__vegasHtmlTemplateOutput.escaped =  greeting ;");
  });

  test("reject evaluation without an Apps Script execution context", () => {
    const template = new HtmlTemplate("<main>Vegas</main>");

    expect(() => template.evaluate()).toThrow(
      "HtmlTemplate evaluation requires an Apps Script execution context.",
    );
  });

  test("expose generated template code for debugging", () => {
    const template = new HtmlTemplate("<main><?= value ?></main>");

    expect(template.getCode()).toContain("__vegasHtmlTemplateOutput.escaped =  value ;");
    expect(template.getCodeWithComments()).toContain("// 1: <main><?= value ?></main>");
  });
});
