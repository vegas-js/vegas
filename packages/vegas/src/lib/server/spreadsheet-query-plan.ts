import type { SpreadsheetQueryExpression } from "./spreadsheet-query-ir";
import type { SpreadsheetColumn } from "./spreadsheet-schema";

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
    ...(options.where === undefined ? {} : { where: options.where }),
    orderBy: options.orderBy === undefined ? [] : [...options.orderBy],
    ...(options.limit === undefined ? {} : { limit: requireQueryLimit(options.limit) }),
  };
}
