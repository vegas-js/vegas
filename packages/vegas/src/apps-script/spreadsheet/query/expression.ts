import type { SpreadsheetColumn } from "../schema";

export type SpreadsheetComparableValue = number | string | boolean | Date;

export type SpreadsheetComparisonKind =
  | "equal"
  | "not-equal"
  | "less-than"
  | "less-than-or-equal"
  | "greater-than"
  | "greater-than-or-equal";

export interface SpreadsheetComparisonExpression<
  Kind extends SpreadsheetComparisonKind = SpreadsheetComparisonKind,
  Value = unknown,
> {
  readonly kind: Kind;
  readonly column: number;
  readonly value: Value;
}

export type SpreadsheetEqualExpression<Value = unknown> = SpreadsheetComparisonExpression<
  "equal",
  Value
>;

export type SpreadsheetNotEqualExpression<Value = unknown> = SpreadsheetComparisonExpression<
  "not-equal",
  Value
>;

export type SpreadsheetLessThanExpression<
  Value extends SpreadsheetComparableValue = SpreadsheetComparableValue,
> = SpreadsheetComparisonExpression<"less-than", Value>;

export type SpreadsheetLessThanOrEqualExpression<
  Value extends SpreadsheetComparableValue = SpreadsheetComparableValue,
> = SpreadsheetComparisonExpression<"less-than-or-equal", Value>;

export type SpreadsheetGreaterThanExpression<
  Value extends SpreadsheetComparableValue = SpreadsheetComparableValue,
> = SpreadsheetComparisonExpression<"greater-than", Value>;

export type SpreadsheetGreaterThanOrEqualExpression<
  Value extends SpreadsheetComparableValue = SpreadsheetComparableValue,
> = SpreadsheetComparisonExpression<"greater-than-or-equal", Value>;

export interface SpreadsheetAndExpression {
  readonly kind: "and";
  readonly expressions: readonly SpreadsheetQueryExpression[];
}

export interface SpreadsheetOrExpression {
  readonly kind: "or";
  readonly expressions: readonly SpreadsheetQueryExpression[];
}

export type SpreadsheetQueryExpression =
  | SpreadsheetEqualExpression
  | SpreadsheetNotEqualExpression
  | SpreadsheetLessThanExpression
  | SpreadsheetLessThanOrEqualExpression
  | SpreadsheetGreaterThanExpression
  | SpreadsheetGreaterThanOrEqualExpression
  | SpreadsheetAndExpression
  | SpreadsheetOrExpression;

function requireQueryExpressions(
  expressions: readonly SpreadsheetQueryExpression[],
  kind: "and" | "or",
): readonly SpreadsheetQueryExpression[] {
  if (expressions.length === 0) {
    throw new RangeError(`Spreadsheet query ${kind} expression must not be empty.`);
  }

  return [...expressions];
}

function spreadsheetComparison<Row, Value, Kind extends SpreadsheetComparisonKind>(
  kind: Kind,
  column: SpreadsheetColumn<Row, Value>,
  value: Value,
): SpreadsheetComparisonExpression<Kind, Value> {
  return {
    kind,
    column: column.index,
    value,
  };
}

export function spreadsheetEq<Row, Value>(
  column: SpreadsheetColumn<Row, Value>,
  value: Value,
): SpreadsheetEqualExpression<Value> {
  return spreadsheetComparison("equal", column, value);
}

export function spreadsheetNe<Row, Value>(
  column: SpreadsheetColumn<Row, Value>,
  value: Value,
): SpreadsheetNotEqualExpression<Value> {
  return spreadsheetComparison("not-equal", column, value);
}

export function spreadsheetLt<Row, Value extends SpreadsheetComparableValue>(
  column: SpreadsheetColumn<Row, Value>,
  value: Value,
): SpreadsheetLessThanExpression<Value> {
  return spreadsheetComparison("less-than", column, value);
}

export function spreadsheetLte<Row, Value extends SpreadsheetComparableValue>(
  column: SpreadsheetColumn<Row, Value>,
  value: Value,
): SpreadsheetLessThanOrEqualExpression<Value> {
  return spreadsheetComparison("less-than-or-equal", column, value);
}

export function spreadsheetGt<Row, Value extends SpreadsheetComparableValue>(
  column: SpreadsheetColumn<Row, Value>,
  value: Value,
): SpreadsheetGreaterThanExpression<Value> {
  return spreadsheetComparison("greater-than", column, value);
}

export function spreadsheetGte<Row, Value extends SpreadsheetComparableValue>(
  column: SpreadsheetColumn<Row, Value>,
  value: Value,
): SpreadsheetGreaterThanOrEqualExpression<Value> {
  return spreadsheetComparison("greater-than-or-equal", column, value);
}

export function spreadsheetAnd(
  ...expressions: readonly SpreadsheetQueryExpression[]
): SpreadsheetAndExpression {
  return {
    kind: "and",
    expressions: requireQueryExpressions(expressions, "and"),
  };
}

export function spreadsheetOr(
  ...expressions: readonly SpreadsheetQueryExpression[]
): SpreadsheetOrExpression {
  return {
    kind: "or",
    expressions: requireQueryExpressions(expressions, "or"),
  };
}
