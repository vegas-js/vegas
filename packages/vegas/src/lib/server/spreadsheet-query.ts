import type { SpreadsheetQueryField } from "./spreadsheet-query-fields";
import { spreadsheetAnd, type SpreadsheetQueryExpression } from "./spreadsheet-query-ir";
import {
  createSpreadsheetQueryPlan,
  spreadsheetOrderBy,
  type SpreadsheetOrderBy,
  type SpreadsheetQueryPlan,
  type SpreadsheetSortDirection,
} from "./spreadsheet-query-plan";
import type { SpreadsheetColumn } from "./spreadsheet-schema";

type SpreadsheetQuerySelector<Fields> = [Fields] extends [undefined]
  ? never
  : (fields: Exclude<Fields, undefined>) => SpreadsheetQueryExpression;

type SpreadsheetOrderSelector<Fields> = [Fields] extends [undefined]
  ? never
  : (fields: Exclude<Fields, undefined>) => SpreadsheetOrderBy;

export interface SpreadsheetQuery<Row, Fields = undefined> {
  where(
    expression: SpreadsheetQueryExpression | SpreadsheetQuerySelector<Fields>,
  ): SpreadsheetQuery<Row, Fields>;
  orderBy<ColumnRow, Value>(
    ...args:
      | readonly [column: SpreadsheetColumn<ColumnRow, Value>, direction: SpreadsheetSortDirection]
      | readonly [selector: SpreadsheetOrderSelector<Fields>]
  ): SpreadsheetQuery<Row, Fields>;
  limit(limit: number): SpreadsheetQuery<Row, Fields>;
  toPlan(): SpreadsheetQueryPlan;
}

interface SpreadsheetQueryState {
  readonly where?: SpreadsheetQueryExpression;
  readonly orderBy: readonly SpreadsheetOrderBy[];
  readonly limit?: number;
}

function requireSpreadsheetQueryFields<Fields>(
  fields: Fields | undefined,
): asserts fields is Exclude<Fields, undefined> {
  if (fields === undefined) {
    throw new TypeError("Spreadsheet query fields are required for selector callbacks.");
  }
}

function createSpreadsheetQueryFromState<Row, Fields>(
  state: SpreadsheetQueryState,
  fields: Fields | undefined,
): SpreadsheetQuery<Row, Fields> {
  return {
    where(input): SpreadsheetQuery<Row, Fields> {
      let expression: SpreadsheetQueryExpression;

      if (typeof input === "function") {
        requireSpreadsheetQueryFields(fields);
        expression = input(fields);
      } else {
        expression = input;
      }

      return createSpreadsheetQueryFromState(
        {
          ...state,
          where: state.where === undefined ? expression : spreadsheetAnd(state.where, expression),
        },
        fields,
      );
    },

    orderBy(...args): SpreadsheetQuery<Row, Fields> {
      const [input, direction] = args;
      let order: SpreadsheetOrderBy;

      if (typeof input === "function") {
        requireSpreadsheetQueryFields(fields);
        order = input(fields);
      } else {
        if (direction === undefined) {
          throw new TypeError(
            "Spreadsheet query sort direction is required when ordering by a column.",
          );
        }

        order = spreadsheetOrderBy(input, direction);
      }

      return createSpreadsheetQueryFromState(
        {
          ...state,
          orderBy: [...state.orderBy, order],
        },
        fields,
      );
    },

    limit(limit): SpreadsheetQuery<Row, Fields> {
      const validated = createSpreadsheetQueryPlan({
        limit,
      });

      return createSpreadsheetQueryFromState(
        {
          ...state,
          limit: validated.limit,
        },
        fields,
      );
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

export function createSpreadsheetQuery<
  Row = unknown,
  Fields extends Readonly<Record<string, SpreadsheetQueryField<unknown>>> | undefined = undefined,
>(fields?: Fields): SpreadsheetQuery<Row, Fields> {
  return createSpreadsheetQueryFromState(
    {
      orderBy: [],
    },
    fields,
  );
}
