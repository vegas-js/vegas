import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const gettingStartedFiles = [
  "README.md",
  "docs/guide/index.md",
  "docs/ja/guide/index.md",
  "docs/ko/guide/index.md",
];
const templates = [
  "vanilla",
  "react",
  "preact",
  "vue",
  "svelte",
  "solid",
  "lit",
  "apps-script-scriptlet",
];
const documentedScripts = ["dev", "build", "preview", "login", "push"];

describe("getting started documentation", () => {
  it.each(gettingStartedFiles)("uses the scaffolded workflow in %s", (filename) => {
    const content = readFileSync(join(root, filename), "utf8");

    expect(content).toContain("npm create vegas@latest");
    expect(content).toContain("npm run dev");
    expect(content).toContain("22.18.0");
    expect(content).not.toMatch(/\bnpx vegas\b/);
  });

  it.each(templates)("documents shared npm scripts for %s", (template) => {
    const filename = join(root, "packages", "create-vegas", `template-${template}`, "package.json");
    const pkg = JSON.parse(readFileSync(filename, "utf8"));

    for (const scriptName of documentedScripts) {
      expect(pkg.scripts).toHaveProperty(scriptName);
    }
    expect(pkg.devDependencies).toHaveProperty("@vegasjs/vegas");
  });
});
