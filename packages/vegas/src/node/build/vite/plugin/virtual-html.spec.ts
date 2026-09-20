import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createBuilder, type Rolldown } from "vite";
import { describe, expect, test } from "vitest";

import type { ClientEntry } from "../../../project";
import { virtualHtml } from "./virtual-html";

describe("virtualHtml", () => {
  test("emit html to client entry html path", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const clientDir = path.join(tempDirPath, "src", "client");
      const sourcePath = path.join(clientDir, "admin", "main.ts");

      fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
      fs.writeFileSync(
        path.join(path.dirname(sourcePath), "style.css"),
        `
          body {
            color: red;
          }
        `,
      );
      fs.writeFileSync(
        sourcePath,
        `
          import "./style.css";
          console.log("hello");
        `,
      );

      const entry: ClientEntry = {
        id: "admin",
        sourcePath,
        htmlPath: "pages/dashboard.html",
      };

      const builder = await createBuilder({
        root: tempDirPath,
        configFile: false,
        plugins: [virtualHtml([entry])],
        environments: {
          client0: {
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
          cssCodeSplit: false,
          rolldownOptions: {
            output: {
              codeSplitting: false,
            },
          },
        },
        logLevel: "silent",
      });

      const result = await builder.build(builder.environments.client0);

      const buildResults = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
      const outputs = buildResults.flatMap((result) => result.output);

      const html = outputs.find((output) => output.fileName === "pages/dashboard.html");

      expect(html).toBeDefined();

      if (!html || html.type !== "asset" || typeof html.source !== "string") {
        throw new Error("Expected HTML asset");
      }

      expect(html.source).toContain("<style>");
      expect(html.source).toContain("color");
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("escape script end tag in client code", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const sourcePath = path.join(tempDirPath, "src", "client", "main.ts");

      fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
      fs.writeFileSync(
        sourcePath,
        `
          console.log("</script>");
        `,
      );

      const entry: ClientEntry = {
        id: "index",
        sourcePath,
        htmlPath: "index.html",
      };
      const builder = await createBuilder({
        root: tempDirPath,
        configFile: false,
        plugins: [virtualHtml([entry])],
        environments: {
          client0: {
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
          cssCodeSplit: false,
          rolldownOptions: {
            output: {
              codeSplitting: false,
            },
          },
        },
        logLevel: "silent",
      });

      const result = await builder.build(builder.environments.client0);

      const buildResults = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
      const outputs = buildResults.flatMap((result) => result.output);

      const html = outputs.find((output) => output.fileName === "index.html");

      expect(html).toBeDefined();

      if (!html || html.type !== "asset" || typeof html.source !== "string") {
        throw new Error("Expected HTML asset");
      }

      expect(html.source).toContain("<\\/script>");
      expect(html.source.match(/<\/script/gi)).toHaveLength(1);
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject multiple JavaScript chunks for one client environment", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const sourcePath = path.join(tempDirPath, "main.ts");
      const extraSourcePath = path.join(tempDirPath, "extra.ts");

      fs.writeFileSync(sourcePath, `console.log("main");`);
      fs.writeFileSync(extraSourcePath, `console.log("extra");`);

      const entry: ClientEntry = {
        id: "index",
        sourcePath,
        htmlPath: "index.html",
      };
      const builder = await createBuilder({
        root: tempDirPath,
        configFile: false,
        plugins: [
          {
            name: "emit-extra-client-chunk",

            buildStart() {
              this.emitFile({
                type: "chunk",
                id: extraSourcePath,
              });
            },
          },
          virtualHtml([entry]),
        ],
        environments: {
          client0: {
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
          cssCodeSplit: false,
          rolldownOptions: {
            output: {
              codeSplitting: false,
            },
          },
        },
        logLevel: "silent",
      });

      await expect(builder.build(builder.environments.client0)).rejects.toThrow(
        'Client environment "client0" must produce exactly one JavaScript chunk; received 2.',
      );
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject non-css client asset", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const sourcePath = path.join(tempDirPath, "main.ts");

      fs.writeFileSync(sourcePath, `console.log("hello");`);

      const entry: ClientEntry = {
        id: "index",
        sourcePath,
        htmlPath: "index.html",
      };
      const builder = await createBuilder({
        root: tempDirPath,
        configFile: false,
        plugins: [
          {
            name: "emit-binary",

            generateBundle() {
              this.emitFile({
                type: "asset",
                fileName: "binary.dat",
                source: new Uint8Array([0x00, 0xff]),
              });
            },
          },
          virtualHtml([entry]),
        ],
        environments: {
          client0: {
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
          cssCodeSplit: false,
          rolldownOptions: {
            output: {
              codeSplitting: false,
            },
          },
        },
        logLevel: "silent",
      });

      await expect(builder.build(builder.environments.client0)).rejects.toThrow(
        "Unsupported client asset: binary.dat",
      );
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });
});
