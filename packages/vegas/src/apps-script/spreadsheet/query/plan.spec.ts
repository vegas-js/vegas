import { describe, expect, expectTypeOf, test } from "vitest";

import { createSpreadsheetColumn } from "../schema";
import { spreadsheetAnd, spreadsheetEq, type SpreadsheetQueryExpression } from "./expression";
import {
  createSpreadsheetQueryPlan,
  spreadsheetOrderBy,
  type SpreadsheetOrderBy,
  type SpreadsheetQueryPlan,
} from "./plan";

interface UserRow {
  readonly id: number;
  readonly name: string;
  readonly active: boolean;
}

describe("spreadsheet query plan", () => {
  test("create a serializable query plan from typed columns", () => {
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const name = createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name);
    const active = createSpreadsheetColumn<UserRow, boolean>("active", 2, (row) => row.active);
    const plan = createSpreadsheetQueryPlan({
      where: spreadsheetAnd(spreadsheetEq(active, true), spreadsheetEq(id, 42)),
      orderBy: [spreadsheetOrderBy(name, "asc"), spreadsheetOrderBy(id, "desc")],
      limit: 25,
    });

    expectTypeOf(plan).toEqualTypeOf<SpreadsheetQueryPlan>();
    expect(plan).toStrictEqual({
      where: {
        kind: "and",
        expressions: [
          { kind: "equal", column: 2, value: true },
          { kind: "equal", column: 0, value: 42 },
        ],
      },
      orderBy: [
        { column: 1, direction: "asc" },
        { column: 0, direction: "desc" },
      ],
      limit: 25,
    });
    expect(JSON.stringify(plan)).toBe(
      '{"where":{"kind":"and","expressions":[{"kind":"equal","column":2,"value":true},{"kind":"equal","column":0,"value":42}]},"orderBy":[{"column":1,"direction":"asc"},{"column":0,"direction":"desc"}],"limit":25}',
    );
  });

  test("create an empty plan without optional operations", () => {
    const plan = createSpreadsheetQueryPlan();

    expect(plan).toStrictEqual({
      orderBy: [],
    });
  });

  test("create typed order descriptors without retaining columns", () => {
    const name = createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name);
    const orderBy = spreadsheetOrderBy(name, "desc");

    expectTypeOf(orderBy).toEqualTypeOf<SpreadsheetOrderBy>();
    expect(orderBy).toStrictEqual({
      column: 1,
      direction: "desc",
    });
    expect(Object.values(orderBy)).not.toContain(name);
  });

  test("copy order descriptors supplied by the caller", () => {
    const name = createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name);
    const order = spreadsheetOrderBy(name, "asc");
    const orderBy = [order];
    const plan = createSpreadsheetQueryPlan({
      orderBy,
    });

    expect(Reflect.set(order, "column", 0)).toBe(true);
    orderBy.length = 0;

    expect(plan.orderBy).toStrictEqual([
      {
        column: 1,
        direction: "asc",
      },
    ]);
  });

  test("copy query expressions supplied by the caller", () => {
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const active = createSpreadsheetColumn<UserRow, boolean>("active", 2, (row) => row.active);
    const where = spreadsheetAnd(spreadsheetEq(active, true), spreadsheetEq(id, 42));
    const plan = createSpreadsheetQueryPlan({
      where,
    });

    expect(Reflect.set(where.expressions[0]!, "column", 1)).toBe(true);
    expect(Reflect.set(where, "expressions", [])).toBe(true);

    expect(plan.where).toStrictEqual({
      kind: "and",
      expressions: [
        { kind: "equal", column: 2, value: true },
        { kind: "equal", column: 0, value: 42 },
      ],
    });
  });

  test("reject unsupported query expression kinds instead of dropping the filter", () => {
    const where = {
      kind: "unsupported",
    } as unknown as SpreadsheetQueryExpression;

    expect(() =>
      createSpreadsheetQueryPlan({
        where,
      }),
    ).toThrow('Spreadsheet query expression kind "unsupported" is not supported.');
  });

  test.each([-1, 1.5, Number.NaN])("reject invalid limit: %s", (limit) => {
    expect(() =>
      createSpreadsheetQueryPlan({
        limit,
      }),
    ).toThrow("Spreadsheet query limit must be a non-negative integer.");
  });

  test("allow a zero limit", () => {
    expect(
      createSpreadsheetQueryPlan({
        limit: 0,
      }),
    ).toStrictEqual({
      orderBy: [],
      limit: 0,
    });
  });
});
