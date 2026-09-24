import { describe, expect, test } from "vitest";

import type {
  RuntimeDataSnapshot,
  RuntimeDataSpreadsheet,
  RuntimeDataSpreadsheetSheet,
} from "../shared/gas";
import {
  reconcileLocalPropertiesStore,
  reconcileLocalRuntimeSession,
  reconcileLocalSpreadsheetStore,
} from "./runtime-data-reconcile";
import { InMemoryPropertiesStore } from "./runtime/in-memory-properties-store";
import { InMemorySpreadsheetStore } from "./runtime/in-memory-spreadsheet-store";
import { LocalRuntimeSession } from "./runtime/local-runtime-session";
import type { InvocationScope } from "./runtime/scope";
import type { RangeReference } from "./runtime/spreadsheet-reference";

function spreadsheet(
  id: string,
  overrides: Partial<RuntimeDataSpreadsheet> = {},
): RuntimeDataSpreadsheet {
  return {
    id,
    name: id,
    sheets: [],
    ...overrides,
  };
}

function sheet(
  id: number,
  values: RuntimeDataSpreadsheetSheet["values"],
): RuntimeDataSpreadsheetSheet {
  return {
    id,
    name: `Sheet${id}`,
    maxRows: 5,
    maxColumns: 5,
    values,
  };
}

function snapshot(
  spreadsheets: readonly RuntimeDataSpreadsheet[],
  sourcePrefix = "runtime",
): RuntimeDataSnapshot {
  return {
    spreadsheets: spreadsheets.map((value) => ({
      source: `${sourcePrefix}/${value.id}.ts`,
      value,
    })),
  };
}

function range(spreadsheetId: string): RangeReference {
  return {
    service: "spreadsheet",
    kind: "range",
    spreadsheetId,
    sheetId: 1,
    row: 1,
    column: 1,
    numRows: 1,
    numColumns: 1,
  };
}

describe("reconcileLocalPropertiesStore", () => {
  const scope: InvocationScope = {
    scriptKey: "script-a",
    userKey: "user-a",
    documentKey: "document-a",
  };

  test("preserve runtime mutations when the Properties fixture is unchanged", async () => {
    const previous = {
      properties: {
        source: "runtime/properties.ts",
        value: {
          scriptProperties: {
            environment: "test",
          },
        },
      },
      spreadsheets: [],
    } satisfies RuntimeDataSnapshot;
    const current = new InMemoryPropertiesStore();

    await current.set(
      {
        kind: "script",
        scriptKey: "script-a",
      },
      "runtime",
      "mutation",
    );

    const next = {
      properties: {
        source: "runtime/renamed/properties.ts",
        value: previous.properties.value,
      },
      spreadsheets: [],
    } satisfies RuntimeDataSnapshot;

    const reconciled = await reconcileLocalPropertiesStore(current, scope, previous, next);

    await expect(
      reconciled.getAll({
        kind: "script",
        scriptKey: "script-a",
      }),
    ).resolves.toStrictEqual({
      runtime: "mutation",
    });

    await reconciled.set(
      {
        kind: "script",
        scriptKey: "script-a",
      },
      "clone",
      "only",
    );

    await expect(
      current.getAll({
        kind: "script",
        scriptKey: "script-a",
      }),
    ).resolves.toStrictEqual({
      runtime: "mutation",
    });
  });

  test("reset current-scope namespaces when the Properties fixture changes", async () => {
    const previous = {
      properties: {
        source: "runtime/properties.ts",
        value: {
          scriptProperties: {
            environment: "old",
          },
        },
      },
      spreadsheets: [],
    } satisfies RuntimeDataSnapshot;
    const current = new InMemoryPropertiesStore();

    await current.setAll(
      {
        kind: "script",
        scriptKey: "script-a",
      },
      {
        runtime: "script mutation",
      },
    );
    await current.setAll(
      {
        kind: "user",
        scriptKey: "script-a",
        userKey: "user-a",
      },
      {
        runtime: "user mutation",
      },
    );
    await current.setAll(
      {
        kind: "document",
        scriptKey: "script-a",
        documentKey: "document-a",
      },
      {
        runtime: "document mutation",
      },
    );
    await current.set(
      {
        kind: "script",
        scriptKey: "other-script",
      },
      "unrelated",
      "preserved",
    );

    const next = {
      properties: {
        source: "runtime/properties.ts",
        value: {
          scriptProperties: {
            environment: "new",
          },
          userProperties: {
            role: "editor",
          },
          documentProperties: {
            document: "seed",
          },
        },
      },
      spreadsheets: [],
    } satisfies RuntimeDataSnapshot;

    const reconciled = await reconcileLocalPropertiesStore(current, scope, previous, next);

    await expect(
      reconciled.getAll({
        kind: "script",
        scriptKey: "script-a",
      }),
    ).resolves.toStrictEqual({
      environment: "new",
    });
    await expect(
      reconciled.getAll({
        kind: "user",
        scriptKey: "script-a",
        userKey: "user-a",
      }),
    ).resolves.toStrictEqual({
      role: "editor",
    });
    await expect(
      reconciled.getAll({
        kind: "document",
        scriptKey: "script-a",
        documentKey: "document-a",
      }),
    ).resolves.toStrictEqual({
      document: "seed",
    });
    await expect(
      reconciled.getAll({
        kind: "script",
        scriptKey: "other-script",
      }),
    ).resolves.toStrictEqual({
      unrelated: "preserved",
    });
  });

  test("clear current-scope namespaces when the Properties fixture is deleted", async () => {
    const previous = {
      properties: {
        source: "runtime/properties.ts",
        value: {
          scriptProperties: {
            environment: "test",
          },
        },
      },
      spreadsheets: [],
    } satisfies RuntimeDataSnapshot;
    const current = new InMemoryPropertiesStore();

    await current.set(
      {
        kind: "script",
        scriptKey: "script-a",
      },
      "runtime",
      "mutation",
    );
    await current.set(
      {
        kind: "user",
        scriptKey: "script-a",
        userKey: "user-a",
      },
      "runtime",
      "mutation",
    );
    await current.set(
      {
        kind: "document",
        scriptKey: "script-a",
        documentKey: "document-a",
      },
      "runtime",
      "mutation",
    );

    const reconciled = await reconcileLocalPropertiesStore(current, scope, previous, {
      spreadsheets: [],
    });

    await expect(
      reconciled.getAll({
        kind: "script",
        scriptKey: "script-a",
      }),
    ).resolves.toStrictEqual({});
    await expect(
      reconciled.getAll({
        kind: "user",
        scriptKey: "script-a",
        userKey: "user-a",
      }),
    ).resolves.toStrictEqual({});
    await expect(
      reconciled.getAll({
        kind: "document",
        scriptKey: "script-a",
        documentKey: "document-a",
      }),
    ).resolves.toStrictEqual({});

    await expect(
      current.getAll({
        kind: "script",
        scriptKey: "script-a",
      }),
    ).resolves.toStrictEqual({
      runtime: "mutation",
    });
  });
});

describe("reconcileLocalSpreadsheetStore", () => {
  test("reset changed fixtures while preserving unchanged and runtime-created state", async () => {
    const budget = spreadsheet("budget", {
      sheets: [sheet(1, [["budget seed"]])],
    });
    const archive = spreadsheet("archive", {
      sheets: [sheet(1, [["archive seed"]])],
    });
    const previous = snapshot([budget, archive]);
    const current = new InMemorySpreadsheetStore(previous.spreadsheets.map(({ value }) => value));

    await current.setRangeValues(range("budget"), [["budget runtime mutation"]]);
    await current.setRangeValues(range("archive"), [["archive runtime mutation"]]);
    const runtimeCreated = await current.createSpreadsheet("Runtime created", 2, 2);

    const next = snapshot([
      spreadsheet("budget", {
        name: "Budget 2027",
        sheets: [sheet(1, [["budget next seed"]])],
      }),
      archive,
    ]);

    const reconciled = reconcileLocalSpreadsheetStore(current, previous, next);

    await expect(reconciled.getRangeValues(range("budget"))).resolves.toStrictEqual([
      ["budget next seed"],
    ]);
    await expect(reconciled.getRangeValues(range("archive"))).resolves.toStrictEqual([
      ["archive runtime mutation"],
    ]);
    await expect(reconciled.getSpreadsheet(runtimeCreated.id)).resolves.toStrictEqual(
      runtimeCreated,
    );

    await expect(current.getRangeValues(range("budget"))).resolves.toStrictEqual([
      ["budget runtime mutation"],
    ]);
    await expect(current.getRangeValues(range("archive"))).resolves.toStrictEqual([
      ["archive runtime mutation"],
    ]);
  });

  test("remove deleted fixtures and add new fixtures without resetting unchanged state", async () => {
    const budget = spreadsheet("budget", {
      sheets: [sheet(1, [["budget seed"]])],
    });
    const archive = spreadsheet("archive", {
      sheets: [sheet(1, [["archive seed"]])],
    });
    const previous = snapshot([budget, archive]);
    const current = new InMemorySpreadsheetStore(previous.spreadsheets.map(({ value }) => value));

    await current.setRangeValues(range("budget"), [["budget runtime mutation"]]);

    const report = spreadsheet("report", {
      sheets: [sheet(1, [["report seed"]])],
    });
    const next = snapshot([budget, report]);

    const reconciled = reconcileLocalSpreadsheetStore(current, previous, next);

    await expect(reconciled.getRangeValues(range("budget"))).resolves.toStrictEqual([
      ["budget runtime mutation"],
    ]);
    await expect(reconciled.getSpreadsheet("archive")).rejects.toThrow(
      "Unknown local Spreadsheet: archive",
    );
    await expect(reconciled.getRangeValues(range("report"))).resolves.toStrictEqual([
      ["report seed"],
    ]);

    await expect(current.getSpreadsheet("archive")).resolves.toMatchObject({
      id: "archive",
    });
  });

  test("ignore source-only fixture changes", async () => {
    const budget = spreadsheet("budget", {
      sheets: [sheet(1, [["budget seed"]])],
    });
    const previous = snapshot([budget], "runtime");
    const current = new InMemorySpreadsheetStore([budget]);

    await current.setRangeValues(range("budget"), [["runtime mutation"]]);

    const next = snapshot([budget], "runtime/renamed");
    const reconciled = reconcileLocalSpreadsheetStore(current, previous, next);

    await expect(reconciled.getRangeValues(range("budget"))).resolves.toStrictEqual([
      ["runtime mutation"],
    ]);
  });

  test("leave the current store unchanged when reconciliation fails", async () => {
    const budget = spreadsheet("budget", {
      sheets: [sheet(1, [["budget seed"]])],
    });
    const previous = snapshot([budget]);
    const current = new InMemorySpreadsheetStore([budget]);
    const runtimeCreated = await current.createSpreadsheet("Runtime created", 2, 2);

    const next = snapshot([
      budget,
      spreadsheet(runtimeCreated.id, {
        name: "Fixture collision",
      }),
    ]);

    expect(() => reconcileLocalSpreadsheetStore(current, previous, next)).toThrow(
      `Cannot replace runtime-created local Spreadsheet with fixture: ${runtimeCreated.id}`,
    );

    await expect(current.getSpreadsheet(runtimeCreated.id)).resolves.toStrictEqual(runtimeCreated);
    await expect(current.getRangeValues(range("budget"))).resolves.toStrictEqual([["budget seed"]]);
  });
});

describe("reconcileLocalRuntimeSession", () => {
  test("preserve session-owned stores while replacing reconciled fixture stores", async () => {
    const scope: InvocationScope = {
      scriptKey: "script-a",
      userKey: "user-a",
    };
    const previous = {
      properties: {
        source: "runtime/properties.ts",
        value: {
          scriptProperties: {
            environment: "old",
          },
        },
      },
      spreadsheets: [
        {
          source: "runtime/budget.ts",
          value: spreadsheet("budget", {
            sheets: [sheet(1, [["old"]])],
          }),
        },
      ],
    } satisfies RuntimeDataSnapshot;
    const propertiesStore = new InMemoryPropertiesStore();

    await propertiesStore.set(
      {
        kind: "script",
        scriptKey: "script-a",
      },
      "runtime",
      "mutation",
    );

    const spreadsheetStore = new InMemorySpreadsheetStore(
      previous.spreadsheets.map(({ value }) => value),
    );
    const current = new LocalRuntimeSession({
      stores: {
        propertiesStore,
        spreadsheetStore,
      },
    });
    const next = {
      properties: {
        source: "runtime/properties.ts",
        value: {
          scriptProperties: {
            environment: "new",
          },
        },
      },
      spreadsheets: [
        {
          source: "runtime/budget.ts",
          value: spreadsheet("budget", {
            sheets: [sheet(1, [["new"]])],
          }),
        },
      ],
    } satisfies RuntimeDataSnapshot;

    const reconciled = await reconcileLocalRuntimeSession(current, scope, previous, next);

    expect(reconciled).not.toBe(current);
    expect(reconciled.stores.cacheStore).toBe(current.stores.cacheStore);
    expect(reconciled.stores.driveIteratorStore).toBe(current.stores.driveIteratorStore);
    expect(reconciled.stores.driveStore).toBe(current.stores.driveStore);
    expect(reconciled.stores.lockStore).toBe(current.stores.lockStore);
    expect(reconciled.stores.propertiesStore).not.toBe(current.stores.propertiesStore);
    expect(reconciled.stores.spreadsheetStore).not.toBe(current.stores.spreadsheetStore);
    await expect(
      reconciled.stores.propertiesStore.getAll({
        kind: "script",
        scriptKey: "script-a",
      }),
    ).resolves.toStrictEqual({
      environment: "new",
    });
    await expect(
      reconciled.stores.spreadsheetStore.getRangeValues(range("budget")),
    ).resolves.toStrictEqual([["new"]]);
    await expect(
      current.stores.propertiesStore.getAll({
        kind: "script",
        scriptKey: "script-a",
      }),
    ).resolves.toStrictEqual({
      runtime: "mutation",
    });
    await expect(
      current.stores.spreadsheetStore.getRangeValues(range("budget")),
    ).resolves.toStrictEqual([["old"]]);
  });
});
