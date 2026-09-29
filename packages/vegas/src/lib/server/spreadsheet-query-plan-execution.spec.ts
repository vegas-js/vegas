import { describe, expect, expectTypeOf, test, vi } from "vitest";

import {
  createSpreadsheetColumn,
  createSpreadsheetQuery,
  createSpreadsheetQueryFields,
  createSpreadsheetQueryPlan,
  createSpreadsheetRowCodec,
  createSpreadsheetSchema,
  createSpreadsheetStorageCodec,
  createSpreadsheetStorageLayout,
  createSpreadsheetTable,
  spreadsheetEq,
  spreadsheetOrderBy,
} from "../server";

interface UserRow {
  readonly id: number;
  readonly name: string;
  readonly active: boolean;
}

function createSheet(values: unknown[][], lastRow = values.length) {
  const getValues = vi.fn(() => values);
  const getRange = vi.fn(() => ({
    getValues,
    setValues: vi.fn(),
  }));
  const getLastRow = vi.fn(() => lastRow);
  const sheet = {
    getLastRow,
    getRange,
  } as unknown as GoogleAppsScript.Spreadsheet.Sheet;

  return {
    sheet,
    getLastRow,
    getRange,
    getValues,
  };
}

function createUserModel() {
  const decode = vi.fn((values: readonly unknown[]): UserRow => ({
    id: Number(values[0]),
    name: String(values[1]),
    active: Boolean(values[2]),
  }));
  const codec = createSpreadsheetRowCodec<UserRow>(3, decode, (row) => [
    row.id,
    row.name,
    row.active,
  ]);
  const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
  const name = createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name);
  const active = createSpreadsheetColumn<UserRow, boolean>("active", 2, (row) => row.active);

  return {
    codec,
    decode,
    id,
    name,
    active,
  };
}

describe("SpreadsheetTable.execute", () => {
  test("execute where, multi-column order, and limit in query-plan order", () => {
    const source = createSheet([
      [1, "Grace", true],
      [2, "Ada", true],
      [3, "Ada", true],
      [4, "Zoe", false],
    ]);
    const model = createUserModel();
    const table = createSpreadsheetTable(source.sheet, model.codec);
    const plan = createSpreadsheetQueryPlan({
      where: spreadsheetEq(model.active, true),
      orderBy: [spreadsheetOrderBy(model.name, "asc"), spreadsheetOrderBy(model.id, "desc")],
      limit: 2,
    });

    expect(table.execute(plan)).toStrictEqual([
      { id: 3, name: "Ada", active: true },
      { id: 2, name: "Ada", active: true },
    ]);
    expect(source.getRange).toHaveBeenCalledWith(1, 1, 4, 3);
    expect(model.decode).toHaveBeenCalledTimes(2);
  });

  test("execute a query builder directly and preserve the table row type", () => {
    const source = createSheet([
      [1, "Grace", true],
      [2, "Ada", true],
      [3, "Katherine", false],
    ]);
    const model = createUserModel();
    const table = createSpreadsheetTable(source.sheet, model.codec);
    const fields = createSpreadsheetQueryFields({
      id: model.id,
      name: model.name,
      active: model.active,
    });
    const query = createSpreadsheetQuery(fields)
      .where(($) => $.active.eq(true))
      .orderBy(($) => $.name.asc())
      .limit(1);
    const rows = table.execute(query);

    expectTypeOf(rows).toEqualTypeOf<UserRow[]>();
    expect(rows).toStrictEqual([{ id: 2, name: "Ada", active: true }]);
    expect(source.getRange).toHaveBeenCalledWith(1, 1, 3, 3);
  });

  test("preserve source row order when order values are equal", () => {
    const source = createSheet([
      [3, "Ada", true],
      [1, "Ada", true],
      [2, "Ada", true],
    ]);
    const model = createUserModel();
    const table = createSpreadsheetTable(source.sheet, model.codec);
    const plan = createSpreadsheetQueryPlan({
      orderBy: [spreadsheetOrderBy(model.name, "asc")],
    });

    expect(table.execute(plan)).toStrictEqual([
      { id: 3, name: "Ada", active: true },
      { id: 1, name: "Ada", active: true },
      { id: 2, name: "Ada", active: true },
    ]);
  });

  test("stop scanning once an unordered limit is satisfied", () => {
    const source = createSheet([
      [1, "Ada", false],
      [2, "Grace", true],
      [3, "Katherine", true],
      [4, "Margaret", true],
    ]);
    const model = createUserModel();
    const storageDecode = vi.fn((values: readonly unknown[]) => [...values]);
    const table = createSpreadsheetTable(source.sheet, model.codec, {
      storageCodec: {
        logicalWidth: 3,
        physicalWidth: 3,
        locate: (logicalIndex) => ({
          kind: "materialized",
          physicalIndex: logicalIndex,
        }),
        encode: (values) => [...values],
        decode: storageDecode,
      },
    });
    const plan = createSpreadsheetQueryPlan({
      where: spreadsheetEq(model.active, true),
      limit: 2,
    });

    expect(table.execute(plan)).toStrictEqual([
      { id: 2, name: "Grace", active: true },
      { id: 3, name: "Katherine", active: true },
    ]);
    expect(storageDecode).toHaveBeenCalledTimes(2);
  });

  test("return immediately for a zero limit without reading the sheet", () => {
    const source = createSheet([[1, "Ada", true]]);
    const model = createUserModel();
    const table = createSpreadsheetTable(source.sheet, model.codec);
    const plan = createSpreadsheetQueryPlan({
      limit: 0,
    });

    expect(table.execute(plan)).toStrictEqual([]);
    expect(source.getLastRow).not.toHaveBeenCalled();
    expect(source.getRange).not.toHaveBeenCalled();
  });

  test("preserve indexed-packed predicate pushdown while executing a plan", () => {
    const source = createSheet([
      [1, true, '["Grace"]'],
      [2, false, "invalid-json"],
      [3, true, '["Ada"]'],
    ]);
    const model = createUserModel();
    const schema = createSpreadsheetSchema(model.codec, [model.id, model.name, model.active]);
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "indexed-packed",
      key: model.id,
      materialize: [model.active],
    });
    const storageCodec = createSpreadsheetStorageCodec(layout);
    const storageDecode = vi.fn((values: readonly unknown[]) => storageCodec.decode(values));
    const table = createSpreadsheetTable(source.sheet, model.codec, {
      storageCodec: {
        ...storageCodec,
        decode: storageDecode,
      },
    });
    const plan = createSpreadsheetQueryPlan({
      where: spreadsheetEq(model.active, true),
      orderBy: [spreadsheetOrderBy(model.name, "asc")],
      limit: 1,
    });

    expect(table.execute(plan)).toStrictEqual([{ id: 3, name: "Ada", active: true }]);
    expect(storageDecode).toHaveBeenCalledTimes(2);
    expect(storageDecode).not.toHaveBeenCalledWith([2, false, "invalid-json"]);
  });

  test("reject incomparable order values instead of coercing them", () => {
    const source = createSheet([
      [1, "Ada", true],
      [2, 42, true],
    ]);
    const model = createUserModel();
    const table = createSpreadsheetTable(source.sheet, model.codec);
    const plan = createSpreadsheetQueryPlan({
      orderBy: [spreadsheetOrderBy(model.name, "asc")],
    });

    expect(() => table.execute(plan)).toThrow("Spreadsheet query order values must be comparable.");
  });

  test("validate manually constructed plan limits and query columns", () => {
    const source = createSheet([]);
    const model = createUserModel();
    const table = createSpreadsheetTable(source.sheet, model.codec);

    expect(() =>
      table.execute({
        orderBy: [],
        limit: -1,
      }),
    ).toThrow("Spreadsheet query limit must be a non-negative integer.");

    expect(() =>
      table.execute({
        orderBy: [
          {
            column: 3,
            direction: "asc",
          },
        ],
      }),
    ).toThrow("Spreadsheet query order column index 3 must be between 0 and 2.");

    expect(() =>
      table.execute({
        where: {
          kind: "and",
          expressions: [
            {
              kind: "equal",
              column: 0,
              value: 1,
            },
            {
              kind: "or",
              expressions: [
                {
                  kind: "equal",
                  column: 3,
                  value: true,
                },
              ],
            },
          ],
        },
        orderBy: [],
      }),
    ).toThrow("Spreadsheet query filter column index 3 must be between 0 and 2.");

    expect(() =>
      table.execute({
        where: {
          kind: "and",
          expressions: [],
        },
        orderBy: [],
      }),
    ).toThrow("Spreadsheet query and expression must not be empty.");
  });
});
