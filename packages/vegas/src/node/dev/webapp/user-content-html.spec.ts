import { describe, expect, test } from "vitest";

import { createBlankUserContentHtml, createUserContentPanelHtml } from "./user-content-html";

describe("user content html", () => {
  test("create the blank iframe document", () => {
    const html = createBlankUserContentHtml();

    expect(html).toContain('<meta http-equiv="X-UA-Compatible" content="IE=edge">');
  });

  test("create the user content panel document", () => {
    const html = createUserContentPanelHtml("http://localhost:5173", "session-1");

    expect(html).toContain(
      'window.vegas = { id: "session-1", hostOrigin: "http://localhost:5173", requestMap: new Map() }',
    );
    expect(html).toContain('<script type="module" src="/@vegas/client"></script>');
    expect(html).toContain('<iframe id="userHtmlFrame"');
    expect(html).toContain('src="/blank"');
  });
});
