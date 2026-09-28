import { spreadsheetAnd, type SpreadsheetQueryExpression } from "./spreadsheet-query-ir";
import {
  createSpreadsheetQueryPlan,
  spreadsheetOrderBy,
  type SpreadsheetOrderBy,
  type SpreadsheetQueryPlan,
  type SpreadsheetSortDirection,
} from "./spreadsheet-query-plan";
import type { SpreadsheetColumn } from "./spreadsheet-schema";

export interface SpreadsheetQuery<Row> {
  where(expression: SpreadsheetQueryExpression): SpreadsheetQuery<Row>;
  orderBy<Value>(
    column: SpreadsheetColumn<Row, Value>,
    direction: SpreadsheetSortDirection,
  ): SpreadsheetQuery<Row>;
  limit(limit: number): SpreadsheetQuery<Row>;
  toPlan(): SpreadsheetQueryPlan;
}

interface SpreadsheetQueryState {
  readonly where?: SpreadsheetQueryExpression;
  readonly orderBy: readonly SpreadsheetOrderBy[];
  readonly limit?: number;
}

function createSpreadsheetQueryFromState<Row>(state: SpreadsheetQueryState): SpreadsheetQuery<Row> {
  return {
    where(expression): SpreadsheetQuery<Row> {
      return createSpreadsheetQueryFromState({
        ...state,
        where: state.where === undefined ? expression : spreadsheetAnd(state.where, expression),
      });
    },

    orderBy(column, direction): SpreadsheetQuery<Row> {
      return createSpreadsheetQueryFromState({
        ...state,
        orderBy: [...state.orderBy, spreadsheetOrderBy(column, direction)],
      });
    },

    limit(limit): SpreadsheetQuery<Row> {
      const validated = createSpreadsheetQueryPlan({
        limit,
      });

      return createSpreadsheetQueryFromState({
        ...state,
        limit: validated.limit,
      });
    },

    toPlan(): SpreadsheetQueryPlan {
      return createSpreadsheetQueryPlan({
        ...(state.where === undefined ? {} : { where: state.where }),
        orderBy: state.orderBy,
        ...(state.limit === undefined ? {} : { limit: state.limit }),
      });
    },
  };
}

export function createSpreadsheetQuery<Row>(): SpreadsheetQuery<Row> {
  return createSpreadsheetQueryFromState({
    orderBy: [],
  });
}
