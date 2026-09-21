import { describe, expect, test } from "vitest";

import type {
  RuntimeDataSnapshot,
  RuntimeDataSpreadsheet,
  RuntimeDataSpreadsheetSheet,
} from "../shared/gas";
import { reconcileLocalSpreadsheetStore } from "./runtime-data-reconcile";
import { InMemorySpreadsheetStore } from "./runtime/in-memory-spreadsheet-store";
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
