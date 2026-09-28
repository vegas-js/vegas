import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createBuilder, type Plugin } from "vite";
import { describe, expect, test } from "vitest";

import type { BuildPlan } from "../../plan";
import { buildApp } from "../build";
import { createBuilderConfig } from "../config";

const SERVER_MODULE_ID = "@vegasjs/vegas/server";
const serverEntryPath = fileURLToPath(new URL("../../../../lib/server.ts", import.meta.url));

function createServerModuleResolver(): Plugin {
  return {
    name: "test-resolve-vegas-server",

    resolveId(source) {
      if (source === SERVER_MODULE_ID) {
        return serverEntryPath;
      }
    },
  };
}

describe("spreadsheet query transform integration", () => {
  test("tree-shake the runtime query builder after fully lowering a static query", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vegas-query-transform-"));

    try {
      const sourcePath = path.join(root, "Code.ts");
      const outputDir = path.join(root, "dist");

      fs.writeFileSync(
        sourcePath,
        `
import {
  createSpreadsheetColumn,
  createSpreadsheetQuery,
  createSpreadsheetQueryFields,
  createSpreadsheetRowCodec,
  createSpreadsheetTable,
} from "@vegasjs/vegas/server";

const codec = createSpreadsheetRowCodec(
  2,
  (values) => ({ id: Number(values[0]), active: Boolean(values[1]) }),
  (row) => [row.id, row.active],
);
const idColumn = createSpreadsheetColumn("id", 0, (row) => row.id);
const activeColumn = createSpreadsheetColumn("active", 1, (row) => row.active);
const columns = { id: idColumn, active: activeColumn };
const fields = createSpreadsheetQueryFields(columns);
const table = createSpreadsheetTable(sheet, codec);

export function run(minimumId: number) {
  return table.execute(
    createSpreadsheetQuery(fields)
      .where(($) => $.active.eq(true))
      .where(($) => $.id.gte(minimumId))
      .limit(10),
  );
}
`,
      );

      const plan: BuildPlan = {
        root,
        outputDir,
        appType: "script",
        mode: "production",
        plugins: [createServerModuleResolver()],
        clientModuleTargets: [],
        clientHtmlTargets: [],
        clientSources: [],
        serverSources: [sourcePath],
      };
      const builder = await createBuilder(createBuilderConfig(plan));
      const artifacts = await buildApp(builder, /^server$/);
      const serverArtifact = artifacts.find(
        (artifact) => typeof artifact.content === "string" && artifact.content.includes("GASApp"),
      );

      expect(serverArtifact).toBeDefined();

      if (!serverArtifact || typeof serverArtifact.content !== "string") {
        throw new Error("Expected a JavaScript server artifact.");
      }

      expect(serverArtifact.content).toContain("greater-than-or-equal");
      expect(serverArtifact.content).not.toContain(
        "Spreadsheet query fields are required for selector callbacks.",
      );
    } finally {
      fs.rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
