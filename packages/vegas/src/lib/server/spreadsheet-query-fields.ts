import type {
  SpreadsheetComparableValue,
  SpreadsheetEqualExpression,
  SpreadsheetGreaterThanExpression,
  SpreadsheetGreaterThanOrEqualExpression,
  SpreadsheetLessThanExpression,
  SpreadsheetLessThanOrEqualExpression,
  SpreadsheetNotEqualExpression,
} from "./spreadsheet-query-ir";
import type { SpreadsheetColumn } from "./spreadsheet-schema";

export interface SpreadsheetQueryField<Value> {
  eq(value: Value): SpreadsheetEqualExpression<Value>;
  ne(value: Value): SpreadsheetNotEqualExpression<Value>;
}

export interface SpreadsheetComparableQueryField<
  Value extends SpreadsheetComparableValue,
> extends SpreadsheetQueryField<Value> {
  lt(value: Value): SpreadsheetLessThanExpression<Value>;
  lte(value: Value): SpreadsheetLessThanOrEqualExpression<Value>;
  gt(value: Value): SpreadsheetGreaterThanExpression<Value>;
  gte(value: Value): SpreadsheetGreaterThanOrEqualExpression<Value>;
}

type SpreadsheetQueryFieldForValue<Value> = [Value] extends [SpreadsheetComparableValue]
  ? SpreadsheetComparableQueryField<Extract<Value, SpreadsheetComparableValue>>
  : SpreadsheetQueryField<Value>;

export type SpreadsheetQueryFields<
  Columns extends Readonly<Record<string, SpreadsheetColumn<unknown, unknown>>>,
> = {
  readonly [Key in keyof Columns]: Columns[Key] extends SpreadsheetColumn<unknown, infer Value>
    ? SpreadsheetQueryFieldForValue<Value>
    : never;
};

interface RuntimeSpreadsheetQueryField {
  eq(value: unknown): SpreadsheetEqualExpression;
  ne(value: unknown): SpreadsheetNotEqualExpression;
  lt(value: SpreadsheetComparableValue): SpreadsheetLessThanExpression;
  lte(value: SpreadsheetComparableValue): SpreadsheetLessThanOrEqualExpression;
  gt(value: SpreadsheetComparableValue): SpreadsheetGreaterThanExpression;
  gte(value: SpreadsheetComparableValue): SpreadsheetGreaterThanOrEqualExpression;
}

function createRuntimeSpreadsheetQueryField(
  column: SpreadsheetColumn<unknown, unknown>,
): RuntimeSpreadsheetQueryField {
  return {
    eq(value): SpreadsheetEqualExpression {
      return {
        kind: "equal",
        column: column.index,
        value,
      };
    },
    ne(value): SpreadsheetNotEqualExpression {
      return {
        kind: "not-equal",
        column: column.index,
        value,
      };
    },
    lt(value): SpreadsheetLessThanExpression {
      return {
        kind: "less-than",
        column: column.index,
        value,
      };
    },
    lte(value): SpreadsheetLessThanOrEqualExpression {
      return {
        kind: "less-than-or-equal",
        column: column.index,
        value,
      };
    },
    gt(value): SpreadsheetGreaterThanExpression {
      return {
        kind: "greater-than",
        column: column.index,
        value,
      };
    },
    gte(value): SpreadsheetGreaterThanOrEqualExpression {
      return {
        kind: "greater-than-or-equal",
        column: column.index,
        value,
      };
    },
  };
}

export function createSpreadsheetQueryFields<
  Columns extends Readonly<Record<string, SpreadsheetColumn<unknown, unknown>>>,
>(columns: Columns): SpreadsheetQueryFields<Columns>;
export function createSpreadsheetQueryFields(
  columns: Readonly<Record<string, SpreadsheetColumn<unknown, unknown>>>,
): Readonly<Record<string, RuntimeSpreadsheetQueryField>> {
  return Object.fromEntries(
    Object.entries(columns).map(([name, column]) => [
      name,
      createRuntimeSpreadsheetQueryField(column),
    ]),
  );
}
