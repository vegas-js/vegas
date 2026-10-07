import type { SpreadsheetColumn } from "../schema";
import type { SpreadsheetQueryExpression } from "./expression";

export type SpreadsheetSortDirection = "asc" | "desc";

export interface SpreadsheetOrderBy {
  readonly column: number;
  readonly direction: SpreadsheetSortDirection;
}

export interface SpreadsheetQueryPlan {
  readonly where?: SpreadsheetQueryExpression;
  readonly orderBy: readonly SpreadsheetOrderBy[];
  readonly limit?: number;
}

export interface SpreadsheetQueryPlanSource {
  toPlan(): SpreadsheetQueryPlan;
}

export interface SpreadsheetQueryPlanOptions {
  readonly where?: SpreadsheetQueryExpression;
  readonly orderBy?: readonly SpreadsheetOrderBy[];
  readonly limit?: number;
}

function requireQueryLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError("Spreadsheet query limit must be a non-negative integer.");
  }

  return limit;
}

function throwUnsupportedQueryExpressionKind(expression: { readonly kind?: unknown }): never {
  throw new RangeError(
    `Spreadsheet query expression kind "${String(expression.kind)}" is not supported.`,
  );
}

function copyQueryExpression(expression: SpreadsheetQueryExpression): SpreadsheetQueryExpression {
  switch (expression.kind) {
    case "equal":
    case "not-equal":
    case "less-than":
    case "less-than-or-equal":
    case "greater-than":
    case "greater-than-or-equal":
      return { ...expression };
    case "and":
      return {
        kind: expression.kind,
        expressions: expression.expressions.map(copyQueryExpression),
      };
    case "or":
      return {
        kind: expression.kind,
        expressions: expression.expressions.map(copyQueryExpression),
      };
    default:
      return throwUnsupportedQueryExpressionKind(expression);
  }
}

function copyOrderBy(order: SpreadsheetOrderBy): SpreadsheetOrderBy {
  return {
    column: order.column,
    direction: order.direction,
  };
}

export function spreadsheetOrderBy<Row, Value>(
  column: SpreadsheetColumn<Row, Value>,
  direction: SpreadsheetSortDirection,
): SpreadsheetOrderBy {
  return {
    column: column.index,
    direction,
  };
}

export function createSpreadsheetQueryPlan(
  options: SpreadsheetQueryPlanOptions = {},
): SpreadsheetQueryPlan {
  return {
    ...(options.where === undefined ? {} : { where: copyQueryExpression(options.where) }),
    orderBy: options.orderBy === undefined ? [] : options.orderBy.map(copyOrderBy),
    ...(options.limit === undefined ? {} : { limit: requireQueryLimit(options.limit) }),
  };
}
