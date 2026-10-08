import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const docsDir = fileURLToPath(new URL("../docs/", import.meta.url));
const sources = [".vitepress/config.ts", "index.md", "ja/index.md", "ko/index.md"];

describe("docs navigation", () => {
  it.each(sources)("links to existing Markdown pages from %s", (source) => {
    const content = readFileSync(join(docsDir, source), "utf8");
    const routes = Array.from(
      content.matchAll(/\blink:\s*["']?(\/[^\s"'#]+)["']?/g),
      (match) => match[1],
    );

    expect(routes.length).toBeGreaterThan(0);

    for (const route of routes) {
      // VitePress: /guide/ maps to guide/index.md; /guide/cli maps to guide/cli.md.
      const markdownPath = route.endsWith("/")
        ? `${route.slice(1)}index.md`
        : `${route.slice(1)}.md`;

      expect(
        existsSync(join(docsDir, markdownPath)),
        `${source}: ${route} must resolve to docs/${markdownPath}`,
      ).toBe(true);
    }
  });
});
