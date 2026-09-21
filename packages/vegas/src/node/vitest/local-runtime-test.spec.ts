import { afterAll, describe, expect, expectTypeOf } from "vitest";

import type { RuntimeDataSnapshot } from "../../shared/gas";
import type { LocalRuntimeHarness } from "../local-runtime-harness";
import type { ResolvedProject } from "../project";
import type { Program } from "../runtime";
import { createLocalRuntimeTest } from "./local-runtime-test";

const project = {
  root: "/project",
  configFile: null,
  clientDir: "/project/src/client",
  serverDir: "/project/src/server",
  runtimeDataDir: "/project/runtime",
  outputDir: "/project/dist",
  appType: "spa",
  plugins: [],
  devServer: { open: false },
  appsScript: {
    manifest: {
      timeZone: "Asia/Tokyo",
    },
  },
} satisfies ResolvedProject;

const snapshot = {
  properties: {
    source: "/project/runtime/properties.ts",
    value: {
      scriptProperties: {
        environment: "test",
      },
    },
  },
  spreadsheets: [
    {
      source: "/project/runtime/budget.ts",
      value: {
        id: "budget",
        name: "Budget",
        sheets: [],
      },
    },
  ],
} satisfies RuntimeDataSnapshot;

const program = {
  source: "function main() { return 'ok'; }",
  htmlFiles: {},
} satisfies Program;

const harnesses = new Set<LocalRuntimeHarness>();
const test = createLocalRuntimeTest({
  project,
  snapshot,
  program,
});

describe("createLocalRuntimeTest", () => {
  test("provide a typed Vegas fixture with seeded state", async ({ vegas }) => {
    expectTypeOf(vegas).toEqualTypeOf<LocalRuntimeHarness>();
    expect(harnesses.has(vegas)).toBe(false);
    harnesses.add(vegas);

    await expect(
      vegas.propertiesStore.getAll({
        kind: "script",
        scriptKey: "/project",
      }),
    ).resolves.toStrictEqual({
      environment: "test",
    });

    await vegas.propertiesStore.set(
      {
        kind: "script",
        scriptKey: "/project",
      },
      "runtime",
      "first test",
    );
    await vegas.spreadsheetStore.renameSpreadsheet(
      await vegas.spreadsheetStore.getSpreadsheet("budget"),
      "First test",
    );
  });

  test("create fresh Local Runtime state for the next test", async ({ vegas }) => {
    expect(harnesses.has(vegas)).toBe(false);
    harnesses.add(vegas);

    await expect(
      vegas.propertiesStore.getAll({
        kind: "script",
        scriptKey: "/project",
      }),
    ).resolves.toStrictEqual({
      environment: "test",
    });
    await expect(
      vegas.spreadsheetStore.getSpreadsheetMetadata(
        await vegas.spreadsheetStore.getSpreadsheet("budget"),
      ),
    ).resolves.toStrictEqual({
      name: "Budget",
    });
  });
});

afterAll(() => {
  expect(harnesses.size).toBe(2);
});
