import { afterAll, describe, expect, expectTypeOf } from "vitest";

import type { LocalRuntimeHarness } from "../local-runtime-harness";
import type { LocalRuntimeProject } from "../local-runtime-project";
import type { Program } from "../runtime";
import type { RuntimeDataFixture } from "../runtime-data-fixture";
import { createLocalRuntimeTest } from "./local-runtime-test";

const project = {
  root: "/project",
  appsScript: {
    manifest: {
      timeZone: "Asia/Tokyo",
    },
  },
} satisfies LocalRuntimeProject;

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
const test = createLocalRuntimeTest({
  project,
  runtimeData,
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
