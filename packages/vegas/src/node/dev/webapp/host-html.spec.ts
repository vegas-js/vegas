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
        xFrameOptionsMode: "DEFAULT",
      },
      "session-1",
    );

    expect(output).toContain("/* keep */");
    expect(output).toContain("\\u003c/div>");
    expect(output).toContain("\\u003c/script>");
    expect(output).toContain('src="http://localhost:5174/userCodeAppPanel?sessionId=session-1"');
    expect(output).toContain('event.origin !== "http://localhost:5174"');
    expect(output).toContain("event.source !== sandboxFrame?.contentWindow");
  });

  test("forward Vite transport state to the user content client", () => {
    const output = createHostHtml(
      new URL("http://localhost:5174/dev"),
      {
        metaTags: [],
        title: "",
        faviconUrl: "",
        content: "<main></main>",
        xFrameOptionsMode: "DEFAULT",
      },
      "session-1",
    );

    expect(output).toContain('import.meta.hot.on("vite:ws:disconnect"');
    expect(output).toContain('type: "vegas:transport", payload: { connected: false }');
    expect(output).toContain('import.meta.hot.on("vite:ws:connect"');
    expect(output).toContain('type: "vegas:transport", payload: { connected: true }');
  });
});
