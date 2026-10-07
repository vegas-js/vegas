import { describe, expect, expectTypeOf, test, vi } from "vitest";

import { spreadsheetEq } from "./query/spreadsheet-query-ir";
import { createSpreadsheetQueryPlan, spreadsheetOrderBy } from "./query/spreadsheet-query-plan";
import { createSpreadsheetRowCodec } from "./spreadsheet-row-codec";
import { createSpreadsheetColumn } from "./spreadsheet-schema";
import { createSpreadsheetTable, type SpreadsheetTableEntry } from "./spreadsheet-table";

interface UserRow {
  readonly id: number;
  readonly name: string;
  readonly active: boolean;
}

describe("SpreadsheetTable.executeEntries", () => {
  test("preserve source table indices through filtering and ordering", () => {
    const values = [
      [1, "Grace", true],
      [2, "Ada", true],
      [3, "Ada", true],
      [4, "Zoe", false],
    ];
    const getValues = vi.fn(() => values);
    const getRange = vi.fn(() => ({
      getValues,
      setValues: vi.fn(),
    }));
    const sheet = {
      getLastRow: vi.fn(() => values.length),
      getRange,
    } as unknown as GoogleAppsScript.Spreadsheet.Sheet;
    const codec = createSpreadsheetRowCodec<UserRow>(
      3,
      (row) => ({
        id: Number(row[0]),
        name: String(row[1]),
        active: Boolean(row[2]),
      }),
      (row) => [row.id, row.name, row.active],
    );
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const name = createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name);
    const active = createSpreadsheetColumn<UserRow, boolean>("active", 2, (row) => row.active);
    const table = createSpreadsheetTable(sheet, codec);
    const entries = table.executeEntries(
      createSpreadsheetQueryPlan({
        where: spreadsheetEq(active, true),
        orderBy: [spreadsheetOrderBy(name, "asc"), spreadsheetOrderBy(id, "desc")],
        limit: 2,
      }),
    );

    expectTypeOf(entries).toEqualTypeOf<SpreadsheetTableEntry<UserRow>[]>();
    expect(entries).toStrictEqual([
      {
        index: 2,
        row: { id: 3, name: "Ada", active: true },
      },
      {
        index: 1,
        row: { id: 2, name: "Ada", active: true },
      },
    ]);
    expect(getRange).toHaveBeenCalledWith(1, 1, 4, 3);
  });
});
