import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createSpreadsheetColumn,
  spreadsheetAnd,
  spreadsheetEq,
  spreadsheetOr,
  type SpreadsheetAndExpression,
  type SpreadsheetEqualExpression,
  type SpreadsheetOrExpression,
  type SpreadsheetQueryExpression,
} from "../server";

interface UserRow {
  readonly id: number;
  readonly active: boolean;
}

describe("spreadsheet query IR", () => {
  test("lower a typed column equality to data-only query IR", () => {
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const expression = spreadsheetEq(id, 42);

    expectTypeOf(expression).toEqualTypeOf<SpreadsheetEqualExpression<number>>();
    expect(expression).toStrictEqual({
      kind: "equal",
      column: 0,
      value: 42,
    });
    expect(JSON.stringify(expression)).toBe('{"kind":"equal","column":0,"value":42}');
  });

  test("compose query expressions with and and or", () => {
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const active = createSpreadsheetColumn<UserRow, boolean>("active", 1, (row) => row.active);
    const idExpression = spreadsheetEq(id, 42);
    const activeExpression = spreadsheetEq(active, true);

    const conjunction = spreadsheetAnd(idExpression, activeExpression);
    const disjunction = spreadsheetOr(idExpression, activeExpression);

    expectTypeOf(conjunction).toEqualTypeOf<SpreadsheetAndExpression>();
    expectTypeOf(disjunction).toEqualTypeOf<SpreadsheetOrExpression>();
    expectTypeOf(conjunction).toMatchTypeOf<SpreadsheetQueryExpression>();
    expect(conjunction).toStrictEqual({
      kind: "and",
      expressions: [
        { kind: "equal", column: 0, value: 42 },
        { kind: "equal", column: 1, value: true },
      ],
    });
    expect(disjunction).toStrictEqual({
      kind: "or",
      expressions: [
        { kind: "equal", column: 0, value: 42 },
        { kind: "equal", column: 1, value: true },
      ],
    });
  });

  test("copy composed expressions supplied by the caller", () => {
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const expression = spreadsheetEq(id, 42);
    const expressions: SpreadsheetQueryExpression[] = [expression];
    const conjunction = spreadsheetAnd(...expressions);

    expressions.length = 0;

    expect(conjunction.expressions).toStrictEqual([expression]);
  });

  test("reject empty logical expressions", () => {
    expect(() => spreadsheetAnd()).toThrow("Spreadsheet query and expression must not be empty.");
    expect(() => spreadsheetOr()).toThrow("Spreadsheet query or expression must not be empty.");
  });
});
