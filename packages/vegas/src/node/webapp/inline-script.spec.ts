import { describe, expect, test } from "vitest";

import { serializeInlineScriptValue } from "./inline-script";

describe("serializeInlineScriptValue", () => {
  test("preserve value while making it safe for inline script", () => {
    const value = {
      userHtml: [
        "<div>/* keep this */</div>",
        "<script>",
        'const value = "</script>";',
        "</script>",
        `"quotes" 'single' \\ backslash`,
        "日本語",
        "\u2028",
        "\u2029",
      ].join("\n"),
    };

    const serialized = serializeInlineScriptValue(value);

    expect(JSON.parse(serialized)).toStrictEqual(value);
    expect(serialized).not.toContain("<");
  });
});
