import { expect, test } from "vitest";

import { HtmlOutput } from "./HtmlOutput";

const defaultXFrameOptionsMode = {} as GoogleAppsScript.HTML.XFrameOptionsMode;

function createOutput(content = "<p>initial</p>") {
  return new HtmlOutput(content, defaultXFrameOptionsMode);
}

test("starts with characterized scalar defaults", () => {
  const output = createOutput();

  expect(output.getContent()).toBe("<p>initial</p>");

  expect(output.getTitle()).toBe("");

  expect(output.getFaviconUrl()).toBeNull();

  expect(output.getHeight()).toBeNull();

  expect(output.getWidth()).toBeNull();

  expect(output.getMetaTags()).toEqual([]);
});

test("appendUntrusted() applies GAS HTML escaping", () => {
  const output = createOutput("");

  const result = output.appendUntrusted(`<b class="x">& '"</b>`);

  expect(result).toBe(output);

  expect(output.getContent()).toBe("&lt;b class=&#34;x&#34;&gt;&amp; &#39;&#34;&lt;/b&gt;");
});

test("rejects unsupported meta tags with the characterized GAS Exception", () => {
  const output = createOutput();

  try {
    output.addMetaTag("vegas-test", "unsupported");

    throw new Error("Expected addMetaTag to throw");
  } catch (error) {
    expect((error as Error).name).toBe("Exception");

    expect((error as Error).message).toBe(
      "The meta tag you specified is not allowed in this context.",
    );
  }

  expect(output.getMetaTags()).toEqual([]);
});

test("clear() preserves characterized HtmlOutput metadata", () => {
  const output = createOutput();

  output
    .setTitle("Vegas title")
    .setFaviconUrl("https://example.com/favicon.ico")
    .setHeight(321)
    .setWidth(654)
    .addMetaTag("viewport", "width=device-width");

  const result = output.clear();

  expect(result).toBe(output);

  expect(output.getContent()).toBe("");

  expect(output.getTitle()).toBe("Vegas title");

  expect(output.getFaviconUrl()).toBe("https://example.com/favicon.ico");

  expect(output.getHeight()).toBe(321);

  expect(output.getWidth()).toBe(654);

  expect(
    output.getMetaTags().map((metaTag) => ({
      name: metaTag.getName(),
      content: metaTag.getContent(),
    })),
  ).toEqual([
    {
      name: "viewport",
      content: "width=device-width",
    },
  ]);
});
