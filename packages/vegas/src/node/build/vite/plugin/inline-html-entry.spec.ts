import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createBuilder, type Rolldown } from "vite";
import { describe, expect, test } from "vitest";

import type { ClientHtmlBuildTarget } from "../../plan";
import { inlineHtmlEntry } from "./inline-html-entry";

async function buildHtmlEntry(root: string, entry: ClientHtmlBuildTarget) {
  const builder = await createBuilder({
    root,
    configFile: false,
    plugins: [inlineHtmlEntry([entry])],
    environments: {
      clientHtml0: {
        consumer: "client",
        build: {
          rolldownOptions: {
            input: entry.sourcePath,
          },
        },
      },
    },
    build: {
      write: false,
      assetsInlineLimit: () => true,
      cssCodeSplit: false,
      rolldownOptions: {
        output: {
          codeSplitting: false,
        },
      },
    },
    logLevel: "silent",
  });

  return builder.build(builder.environments.clientHtml0);
}

describe("inlineHtmlEntry", () => {
  test("emit a self-contained HTML artifact at the configured path", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const clientDir = path.join(root, "src", "client");
      const sourcePath = path.join(clientDir, "index.html");
      const scriptPath = path.join(clientDir, "main.ts");
      const stylePath = path.join(clientDir, "style.css");

      fs.mkdirSync(clientDir, { recursive: true });
      fs.writeFileSync(
        sourcePath,
        `<!doctype html>
        <html>
          <head>
            <title>Custom Vegas Page</title>
            <link rel="stylesheet" href="./style.css">
          </head>
          <body>
            <main id="app">custom-layout</main>
            <script type="module" src="./main.ts"></script>
          </body>
        </html>`,
      );
      fs.writeFileSync(scriptPath, `console.log("html-client-ready");`);
      fs.writeFileSync(stylePath, `#app { color: red; }`);

      const entry: ClientHtmlBuildTarget = {
        sourcePath,
        htmlPath: "pages/dashboard.html",
      };
      const result = await buildHtmlEntry(root, entry);
      const buildResults = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
      const outputs = buildResults.flatMap((buildResult) => buildResult.output);

      expect(outputs).toHaveLength(1);

      const [html] = outputs;
      expect(html.fileName).toBe("pages/dashboard.html");

      if (html.type !== "asset" || typeof html.source !== "string") {
        throw new Error("Expected HTML asset");
      }

      expect(html.source).toContain("<title>Custom Vegas Page</title>");
      expect(html.source).toContain('<main id="app">custom-layout</main>');
      expect(html.source).toContain("html-client-ready");
      expect(html.source).toContain("color:");
      expect(html.source).not.toMatch(/<script[^>]+\bsrc=/i);
      expect(html.source).not.toMatch(/<link[^>]+\brel="stylesheet"/i);
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("preserve Apps Script scriptlets while processing physical HTML", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const clientDir = path.join(root, "src", "client");
      const sourcePath = path.join(clientDir, "index.html");
      const stylePath = path.join(clientDir, "style.css");

      fs.mkdirSync(clientDir, { recursive: true });
      fs.writeFileSync(
        sourcePath,
        `<!doctype html>
        <html>
          <head>
            <link rel="stylesheet" href="./style.css">
          </head>
          <body data-user="<?= user ?>">
            <? const title = getTitle(); ?>
            <h1><?= title ?></h1>
            <main><?!= trustedHtml ?></main>
            <script>
              window.initialUser = <?= JSON.stringify(user) ?>;
            </script>
          </body>
        </html>`,
      );
      fs.writeFileSync(stylePath, `h1 { color: red; }`);

      const entry: ClientHtmlBuildTarget = {
        sourcePath,
        htmlPath: "index.html",
      };
      const result = await buildHtmlEntry(root, entry);
      const buildResults = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
      const outputs = buildResults.flatMap((buildResult) => buildResult.output);
      const [html] = outputs;

      if (html?.type !== "asset" || typeof html.source !== "string") {
        throw new Error("Expected HTML asset");
      }

      expect(html.source).toContain('data-user="<?= user ?>"');
      expect(html.source).toContain("<? const title = getTitle(); ?>");
      expect(html.source).toContain("<h1><?= title ?></h1>");
      expect(html.source).toContain("<main><?!= trustedHtml ?></main>");
      expect(html.source).toContain("window.initialUser = <?= JSON.stringify(user) ?>;");
      expect(html.source).toContain("color:");
      expect(html.source).not.toContain("__vegas_apps_script_scriptlet_");
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject outputs that cannot be embedded into the HTML artifact", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const sourcePath = path.join(root, "index.html");
      fs.writeFileSync(sourcePath, `<!doctype html><html><body>hello</body></html>`);

      const entry: ClientHtmlBuildTarget = {
        sourcePath,
        htmlPath: "index.html",
      };
      const builder = await createBuilder({
        root,
        configFile: false,
        plugins: [
          {
            name: "emit-extra-html-asset",
            generateBundle() {
              this.emitFile({
                type: "asset",
                fileName: "extra.dat",
                source: new Uint8Array([0x01]),
              });
            },
          },
          inlineHtmlEntry([entry]),
        ],
        environments: {
          clientHtml0: {
            consumer: "client",
            build: {
              rolldownOptions: {
                input: entry.sourcePath,
              },
            },
          },
        },
        build: {
          write: false,
        },
        logLevel: "silent",
      });

      await expect(builder.build(builder.environments.clientHtml0)).rejects.toThrow(
        'Client HTML environment "clientHtml0" must produce a self-contained HTML artifact; unsupported output: extra.dat.',
      );
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
