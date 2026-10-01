import { describe, expect, expectTypeOf, test } from "vitest";

import { createSpreadsheetQuery, type SpreadsheetQuery } from "./spreadsheet-query";
import { createSpreadsheetQueryFields } from "./spreadsheet-query-fields";
import { spreadsheetEq } from "./spreadsheet-query-ir";
import type { SpreadsheetQueryPlan } from "./spreadsheet-query-plan";
import { createSpreadsheetColumn } from "./spreadsheet-schema";

interface UserRow {
  readonly id: number;
  readonly name: string;
  readonly active: boolean;
}

function createColumns() {
  return {
    id: createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id),
    name: createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name),
    active: createSpreadsheetColumn<UserRow, boolean>("active", 2, (row) => row.active),
  };
}

describe("createSpreadsheetQuery", () => {
  test("build a query plan through a typed method chain", () => {
    const columns = createColumns();
    const query = createSpreadsheetQuery<UserRow>()
      .where(spreadsheetEq(columns.active, true))
      .orderBy(columns.name, "asc")
      .orderBy(columns.id, "desc")
      .limit(25);
    const plan = query.toPlan();

    expectTypeOf(query).toEqualTypeOf<SpreadsheetQuery<UserRow>>();
    expectTypeOf(plan).toEqualTypeOf<SpreadsheetQueryPlan>();
    expect(plan).toStrictEqual({
      where: {
        kind: "equal",
        column: 2,
        value: true,
      },
      orderBy: [
        {
          column: 1,
          direction: "asc",
        },
        {
          column: 0,
          direction: "desc",
        },
      ],
      limit: 25,
    });
  });

  test("build a query plan through field selector callbacks", () => {
    const fields = createSpreadsheetQueryFields(createColumns());
    const query = createSpreadsheetQuery(fields)
      .where(($) => $.active.eq(true))
      .where(($) => $.id.gte(18))
      .orderBy(($) => $.name.asc())
      .orderBy(($) => $.id.desc())
      .limit(10);

    expect(query.toPlan()).toStrictEqual({
      where: {
        kind: "and",
        expressions: [
          {
            kind: "equal",
            column: 2,
            value: true,
          },
          {
            kind: "greater-than-or-equal",
            column: 0,
            value: 18,
          },
        ],
      },
      orderBy: [
        {
          column: 1,
          direction: "asc",
        },
        {
          column: 0,
          direction: "desc",
        },
      ],
      limit: 10,
    });
  });

  test("combine repeated where calls with and", () => {
    const columns = createColumns();
    const plan = createSpreadsheetQuery<UserRow>()
      .where(spreadsheetEq(columns.active, true))
      .where(spreadsheetEq(columns.id, 42))
      .toPlan();

    expect(plan).toStrictEqual({
      where: {
        kind: "and",
        expressions: [
          {
            kind: "equal",
            column: 2,
            value: true,
          },
          {
            kind: "equal",
            column: 0,
            value: 42,
          },
        ],
      },
      orderBy: [],
    });
  });

  test("keep query branches independent", () => {
    const columns = createColumns();
    const base = createSpreadsheetQuery<UserRow>().where(spreadsheetEq(columns.active, true));
    const limited = base.limit(1);
    const ordered = base.orderBy(columns.name, "asc");

    expect(base.toPlan()).toStrictEqual({
      where: {
        kind: "equal",
        column: 2,
        value: true,
      },
      orderBy: [],
    });
    expect(limited.toPlan()).toStrictEqual({
      where: {
        kind: "equal",
        column: 2,
        value: true,
      },
      orderBy: [],
      limit: 1,
    });
    expect(ordered.toPlan()).toStrictEqual({
      where: {
        kind: "equal",
        column: 2,
        value: true,
      },
      orderBy: [
        {
          column: 1,
          direction: "asc",
        },
      ],
    });
  });

  test("snapshot expressions and orders supplied while extending a query", () => {
    const columns = createColumns();
    const fields = createSpreadsheetQueryFields(columns);
    const expression = spreadsheetEq(columns.active, true);
    const order = {
      column: columns.name.index,
      direction: "asc" as const,
    };
    const query = createSpreadsheetQuery(fields)
      .where(expression)
      .orderBy(() => order);

    expect(Reflect.set(expression, "column", columns.id.index)).toBe(true);
    order.column = columns.id.index;

    const plan = query.toPlan();

    expect(plan).toStrictEqual({
      where: {
        kind: "equal",
        column: 2,
        value: true,
      },
      orderBy: [
        {
          column: 1,
          direction: "asc",
        },
      ],
    });

    expect(Reflect.set(plan.where!, "column", columns.id.index)).toBe(true);
    expect(Reflect.set(plan.orderBy[0]!, "column", columns.id.index)).toBe(true);
    expect(query.toPlan()).toStrictEqual({
      where: {
        kind: "equal",
        column: 2,
        value: true,
      },
      orderBy: [
        {
          column: 1,
          direction: "asc",
        },
      ],
    });
  });

  test("replace a previous limit without mutating the previous query", () => {
    const limited = createSpreadsheetQuery<UserRow>().limit(10);
    const narrowed = limited.limit(3);

    expect(limited.toPlan()).toStrictEqual({
      orderBy: [],
      limit: 10,
    });
    expect(narrowed.toPlan()).toStrictEqual({
      orderBy: [],
      limit: 3,
    });
  });

  test.each([-1, 1.5, Number.NaN])("reject invalid limit: %s", (limit) => {
    expect(() => createSpreadsheetQuery<UserRow>().limit(limit)).toThrow(
      "Spreadsheet query limit must be a non-negative integer.",
    );
  });

  test("support dynamic query composition", () => {
    const columns = createColumns();
    let query = createSpreadsheetQuery<UserRow>();

    query = query.where(spreadsheetEq(columns.active, true));

    const shouldLimit = true;

    if (shouldLimit) {
      query = query.limit(2);
    }

    expect(query.toPlan()).toStrictEqual({
      where: {
        kind: "equal",
        column: 2,
        value: true,
      },
      orderBy: [],
      limit: 2,
    });
  });
});
