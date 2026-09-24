import { describe, expect, test } from "vitest";

import { HtmlOutput, HtmlOutputMetaTag } from "./index";

// Public contract:
// https://developers.google.com/apps-script/reference/html/html-output-meta-tag
describe("HtmlOutputMetaTag public contract", () => {
  test("return the name and content of a meta tag added to HtmlOutput", () => {
    const output = new HtmlOutput().addMetaTag("viewport", "width=device-width, initial-scale=1");

    const tags = output.getMetaTags();

    expect(tags).toHaveLength(1);
    expect(tags[0]).toBeInstanceOf(HtmlOutputMetaTag);
    expect(tags[0].getName()).toBe("viewport");
    expect(tags[0].getContent()).toBe("width=device-width, initial-scale=1");
  });
});
