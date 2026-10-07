import { describe, expect, test } from "vitest";

import { createHostBridgeScript } from "./host-bridge-script";

describe("createHostBridgeScript", () => {
  test("serialize server data and trust only the user content frame", () => {
    const output = createHostBridgeScript(
      "http://localhost:5174",
      '<div>/* keep */</div></script><script>alert("x")</script>',
    );

    expect(output).toContain("/* keep */");
    expect(output).toContain("\\u003c/div>");
    expect(output).toContain("\\u003c/script>");
    expect(output).toContain('event.origin !== "http://localhost:5174"');
    expect(output).toContain("event.source !== sandboxFrame?.contentWindow");
  });

  test("forward Vite transport state to the user content client", () => {
    const output = createHostBridgeScript("http://localhost:5174", "<main></main>");

    expect(output).toContain('import.meta.hot.on("vite:ws:disconnect"');
    expect(output).toContain('type: "vegas:transport", payload: { connected: false }');
    expect(output).toContain('import.meta.hot.on("vite:ws:connect"');
    expect(output).toContain('type: "vegas:transport", payload: { connected: true }');
  });
});
