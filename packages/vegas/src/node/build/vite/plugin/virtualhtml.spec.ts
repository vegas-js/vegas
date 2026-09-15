import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createBuilder, type Rolldown } from "vite";
import { describe, expect, test } from "vitest";

import type { ClientEntry } from "../../../project";
import { virtualHTML } from "./virtualhtml";

describe("virtualHTML", () => {
  test("emit html to client entry html path", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const clientDir = path.join(tempDirPath, "src", "client");
      const sourcePath = path.join(clientDir, "admin", "main.ts");

      fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
      fs.writeFileSync(sourcePath, `console.log("hello");`);

      const entry: ClientEntry = {
        id: "admin",
        sourcePath,
        htmlPath: "pages/dashboard.html",
      };

      const builder = await createBuilder({
        root: tempDirPath,
        configFile: false,
        plugins: [virtualHTML([entry])],
        environments: {
          client0: {
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

      expect(outputs.map((output) => output.fileName)).toContain("pages/dashboard.html");
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });
});
