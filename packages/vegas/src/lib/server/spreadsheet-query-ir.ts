import type { SpreadsheetColumn } from "./spreadsheet-schema";

export interface SpreadsheetEqualExpression<Value = unknown> {
  readonly kind: "equal";
  readonly column: number;
  readonly value: Value;
}

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

export function spreadsheetEq<Row, Value>(
  column: SpreadsheetColumn<Row, Value>,
  value: Value,
): SpreadsheetEqualExpression<Value> {
  return {
    kind: "equal",
    column: column.index,
    value,
  };
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
