import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createBuilder, type Rolldown } from "vite";
import { describe, expect, test } from "vitest";

import { exportBridge } from "./exportbridge";

async function buildServer(root: string, sourcePath: string) {
  const builder = await createBuilder({
    root,
    configFile: false,
    plugins: [exportBridge()],
    environments: {
      server: {
        build: {
          lib: {
            entry: sourcePath,
            formats: ["iife"],
            name: "GASApp",
          },
        },
      },
    },
    build: {
      write: false,
    },
    logLevel: "silent",
  });

  return builder.build(builder.environments.server);
}

describe("exportBridge", () => {
  test("expose named server exports as global functions", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const sourcePath = path.join(tempDirPath, "Code.ts");

      fs.writeFileSync(
        sourcePath,
        `
          export function hello(name: string) {
            return \`Hello, \${name}\`;
          }
        `,
      );

      const result = await buildServer(tempDirPath, sourcePath);
      const buildResults = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
      const entry = buildResults
        .flatMap((buildResult) => buildResult.output)
        .find((output) => output.type === "chunk" && output.isEntry);

      expect(entry).toBeDefined();

      if (!entry || entry.type !== "chunk") {
        throw new Error("Expected server entry chunk");
      }

      expect(entry.code).toContain("/* Function bridge for GAS Client */");
      expect(entry.code).toContain("function hello(...args) { return GASApp.hello(...args); };");
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });

  test("reject server export that cannot become a global function declaration", async () => {
    const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-"));

    try {
      const sourcePath = path.join(tempDirPath, "Code.ts");

      fs.writeFileSync(
        sourcePath,
        `
          export default function () {
            return "default";
          }
        `,
      );

      await expect(buildServer(tempDirPath, sourcePath)).rejects.toThrow(
        'Server export "default" cannot be exposed as an Apps Script function.',
      );
    } finally {
      fs.rmSync(tempDirPath, {
        recursive: true,
        force: true,
      });
    }
  });
});
