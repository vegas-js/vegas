import { afterAll, describe, expect, expectTypeOf } from "vitest";

import type { LocalRuntimeHarness } from "../harness";
import type { ResolvedProject } from "../project";
import type { Program } from "../runtime";
import type { RuntimeDataFixture } from "../runtime-data";
import { createLocalRuntimeTestWithDependencies } from "./local-runtime-test";

const project = {
  root: "/project",
  configFile: null,
  clientDir: "/project/src/client",
  serverDir: "/project/src/server",
  runtimeDataDir: "/project/runtime",
  outputDir: "/project/dist",
  appType: "script",
  plugins: [],
  devServer: { open: false },
  appsScript: {
    serverFunctions: {
      backend: "local",
    },
    manifest: {
      exceptionLogging: "STACKDRIVER",
      runtimeVersion: "V8",
      timeZone: "Asia/Tokyo",
      webapp: {
        access: "MYSELF",
        executeAs: "USER_ACCESSING",
      },
    },
  },
} satisfies ResolvedProject;

const runtimeData = {
  properties: {
    scriptProperties: {
      environment: "test",
    },
  },
  spreadsheets: [
    {
      id: "budget",
      name: "Budget",
      sheets: [],
    },
  ],
} satisfies RuntimeDataFixture;

const program = {
  source: "function main() { return 'ok'; }",
  htmlFiles: {},
} satisfies Program;

const harnesses = new Set<LocalRuntimeHarness>();
const loadHarnessProjectCalls: Array<{ readonly root?: string }> = [];
const test = createLocalRuntimeTestWithDependencies(
  {
    root: "project",
    runtimeData,
  },
  {
    loadHarnessProject: async (options) => {
      loadHarnessProjectCalls.push(options);
      return { project, program };
    },
  },
);

describe("createLocalRuntimeTest", () => {
  test("load the Vegas project and provide a typed fixture with seeded state", async ({
    vegas,
  }) => {
    expectTypeOf(vegas).toEqualTypeOf<LocalRuntimeHarness>();
    expect(harnesses.has(vegas)).toBe(false);
    harnesses.add(vegas);

    expect(loadHarnessProjectCalls).toStrictEqual([
      {
        root: "project",
      },
    ]);

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
  expect(loadHarnessProjectCalls).toHaveLength(1);
});
