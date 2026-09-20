import { describe, expect, test } from "vitest";

import { HtmlTemplate } from "./index";

describe("HtmlTemplate", () => {
  test("return unprocessed template content", () => {
    const template = new HtmlTemplate("<main><?= value ?></main>");

    expect(template.getRawContent()).toBe("<main><?= value ?></main>");
  });
});
