import { describe, expect, test } from "vitest";

import type { RuntimeDataSnapshot } from "../shared/gas";
import { createLocalRuntimeHarness } from "./local-runtime-harness";
import type { LocalRuntimeProject } from "./local-runtime-project";
import type { Program } from "./runtime";

const project = {
  root: "/project",
  appsScript: {
    manifest: {
      timeZone: "Asia/Tokyo",
    },
  },
} satisfies LocalRuntimeProject;

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
        sheets: [
          {
            id: 1,
            name: "Sheet1",
            maxRows: 5,
            maxColumns: 5,
            values: [["seed"]],
          },
        ],
      },
    },
  ],
} satisfies RuntimeDataSnapshot;

const program = {
  source: "function main() { return 'ok'; }",
  htmlFiles: {},
} satisfies Program;

describe("createLocalRuntimeHarness", () => {
  test("create a seeded Local Runtime with directly accessible test stores", async () => {
    const harness = await createLocalRuntimeHarness({
      project,
      snapshot,
      program,
    });

    await expect(
      harness.propertiesStore.getAll({
        kind: "script",
        scriptKey: "/project",
      }),
    ).resolves.toStrictEqual({
      environment: "test",
    });
    await expect(harness.spreadsheetStore.getSpreadsheet("budget")).resolves.toMatchObject({
      id: "budget",
    });
    expect(harness.runtime.resources.spreadsheets).toBe(harness.spreadsheetStore);
  });

  test("create isolated state for each harness instance", async () => {
    const first = await createLocalRuntimeHarness({
      project,
      snapshot,
      program,
    });
    const second = await createLocalRuntimeHarness({
      project,
      snapshot,
      program,
    });

    expect(first.session).not.toBe(second.session);
    expect(first.session.stores.cacheStore).not.toBe(second.session.stores.cacheStore);
    expect(first.session.stores.driveIteratorStore).not.toBe(
      second.session.stores.driveIteratorStore,
    );
    expect(first.session.stores.driveStore).not.toBe(second.session.stores.driveStore);
    expect(first.session.stores.lockStore).not.toBe(second.session.stores.lockStore);
    expect(first.propertiesStore).not.toBe(second.propertiesStore);
    expect(first.spreadsheetStore).not.toBe(second.spreadsheetStore);

    await first.propertiesStore.set(
      {
        kind: "script",
        scriptKey: "/project",
      },
      "runtime",
      "first only",
    );
    await first.spreadsheetStore.renameSpreadsheet(
      await first.spreadsheetStore.getSpreadsheet("budget"),
      "First only",
    );

    await expect(
      second.propertiesStore.getAll({
        kind: "script",
        scriptKey: "/project",
      }),
    ).resolves.toStrictEqual({
      environment: "test",
    });
    await expect(
      second.spreadsheetStore.getSpreadsheetMetadata(
        await second.spreadsheetStore.getSpreadsheet("budget"),
      ),
    ).resolves.toStrictEqual({
      name: "Budget",
    });
  });
});
