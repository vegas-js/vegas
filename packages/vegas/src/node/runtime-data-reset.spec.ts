import { describe, expect, test } from "vitest";

import type { RuntimeDataSnapshot } from "../shared/gas";
import type { InvocationScope } from "./runtime";
import { resetLocalRuntimeSession } from "./runtime-data-reset";

const scope = {
  scriptKey: "script-a",
  userKey: "user-a",
  documentKey: "document-a",
} satisfies InvocationScope;

const snapshot = {
  properties: {
    source: "runtime/properties.ts",
    value: {
      scriptProperties: {
        environment: "test",
      },
      userProperties: {
        role: "editor",
      },
      documentProperties: {
        document: "seed",
      },
    },
  },
  spreadsheets: [
    {
      source: "runtime/budget.ts",
      value: {
        id: "budget",
        name: "Budget",
        sheets: [],
      },
    },
  ],
} satisfies RuntimeDataSnapshot;

describe("resetLocalRuntimeSession", () => {
  test("create fresh session-owned stores seeded from Runtime data", async () => {
    const session = await resetLocalRuntimeSession(scope, snapshot);

    await expect(
      session.stores.propertiesStore.getAll({
        kind: "script",
        scriptKey: "script-a",
      }),
    ).resolves.toStrictEqual({
      environment: "test",
    });
    await expect(
      session.stores.propertiesStore.getAll({
        kind: "user",
        scriptKey: "script-a",
        userKey: "user-a",
      }),
    ).resolves.toStrictEqual({
      role: "editor",
    });
    await expect(
      session.stores.propertiesStore.getAll({
        kind: "document",
        scriptKey: "script-a",
        documentKey: "document-a",
      }),
    ).resolves.toStrictEqual({
      document: "seed",
    });
    await expect(session.stores.spreadsheetStore.getSpreadsheet("budget")).resolves.toMatchObject({
      id: "budget",
    });
  });

  test("discard runtime mutations when creating the reset session", async () => {
    const current = await resetLocalRuntimeSession(scope, snapshot);

    await current.stores.propertiesStore.set(
      {
        kind: "script",
        scriptKey: "script-a",
      },
      "runtime",
      "mutation",
    );
    await current.stores.spreadsheetStore.renameSpreadsheet(
      await current.stores.spreadsheetStore.getSpreadsheet("budget"),
      "Runtime mutation",
    );
    const runtimeCreated = await current.stores.spreadsheetStore.createSpreadsheet(
      "Runtime created",
      2,
      2,
    );

    const reset = await resetLocalRuntimeSession(scope, snapshot);

    expect(reset.stores.cacheStore).not.toBe(current.stores.cacheStore);
    expect(reset.stores.driveIteratorStore).not.toBe(current.stores.driveIteratorStore);
    expect(reset.stores.driveStore).not.toBe(current.stores.driveStore);
    expect(reset.stores.lockStore).not.toBe(current.stores.lockStore);
    expect(reset.stores.propertiesStore).not.toBe(current.stores.propertiesStore);
    expect(reset.stores.spreadsheetStore).not.toBe(current.stores.spreadsheetStore);
    await expect(
      reset.stores.propertiesStore.getAll({
        kind: "script",
        scriptKey: "script-a",
      }),
    ).resolves.toStrictEqual({
      environment: "test",
    });
    await expect(
      reset.stores.spreadsheetStore.getSpreadsheetMetadata(
        await reset.stores.spreadsheetStore.getSpreadsheet("budget"),
      ),
    ).resolves.toStrictEqual({
      name: "Budget",
    });
    await expect(reset.stores.spreadsheetStore.getSpreadsheet(runtimeCreated.id)).rejects.toThrow(
      `Unknown local Spreadsheet: ${runtimeCreated.id}`,
    );
  });
});
