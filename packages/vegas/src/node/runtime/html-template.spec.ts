import { describe, expect, test } from "vitest";

import { HtmlTemplate } from "./index";

describe("HtmlTemplate", () => {
  test("return unprocessed template content", () => {
    const template = new HtmlTemplate("<main><?= value ?></main>");

    expect(template.getRawContent()).toBe("<main><?= value ?></main>");
  });

  test("expose generated template code for debugging", () => {
    const template = new HtmlTemplate("<main><?= value ?></main>");

    expect(template.getCode()).toContain("__vegasHtmlTemplateOutput.escaped =  value ;");
    expect(template.getCodeWithComments()).toContain("// 1: <main><?= value ?></main>");
  });
});
