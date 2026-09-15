import { describe, expect, test } from "vitest";

import { createHostHtml } from "./host-html";

describe("createHostHtml", () => {
  test("preserve user html in inline server data", () => {
    const output = createHostHtml(
      new URL("http://localhost:5174/dev"),
      {
        metaTags: [],
        title: "",
        faviconUrl: "",
        content: '<div>/* keep */</div></script><script>alert("x")</script>',
        xFrameOptionsMode: undefined,
      },
      "session-1",
    );

    expect(output).toContain("/* keep */");
    expect(output).toContain("\\u003c/div>");
    expect(output).toContain("\\u003c/script>");
    expect(output).toContain('src="http://localhost:5174/userCodeAppPanel?sessionId=session-1"');
  });
});
