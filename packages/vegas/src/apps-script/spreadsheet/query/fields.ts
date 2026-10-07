import type { SpreadsheetColumn, SpreadsheetSchema } from "../schema";
import type {
  SpreadsheetComparableValue,
  SpreadsheetEqualExpression,
  SpreadsheetGreaterThanExpression,
  SpreadsheetGreaterThanOrEqualExpression,
  SpreadsheetLessThanExpression,
  SpreadsheetLessThanOrEqualExpression,
  SpreadsheetNotEqualExpression,
} from "./expression";
import type { SpreadsheetOrderBy } from "./plan";

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
  asc(): SpreadsheetOrderBy;
  desc(): SpreadsheetOrderBy;
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
  asc(): SpreadsheetOrderBy;
  desc(): SpreadsheetOrderBy;
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
    asc(): SpreadsheetOrderBy {
      return {
        column: column.index,
        direction: "asc",
      };
    },
    desc(): SpreadsheetOrderBy {
      return {
        column: column.index,
        direction: "desc",
      };
    },
  };
}

function isSpreadsheetQueryFieldSchema(source: unknown): source is Readonly<{
  columns: Readonly<Record<string, SpreadsheetColumn<unknown, unknown>>>;
  columnList: readonly SpreadsheetColumn<unknown, unknown>[];
  getColumn(name: string): SpreadsheetColumn<unknown, unknown> | undefined;
}> {
  return (
    typeof source === "object" &&
    source !== null &&
    "columns" in source &&
    "columnList" in source &&
    Array.isArray(source.columnList) &&
    "getColumn" in source &&
    typeof source.getColumn === "function"
  );
}

export function createSpreadsheetQueryFields<
  Columns extends Readonly<Record<string, SpreadsheetColumn<unknown, unknown>>>,
>(columns: Columns): SpreadsheetQueryFields<Columns>;
export function createSpreadsheetQueryFields<
  Row,
  Columns extends Readonly<Record<string, SpreadsheetColumn<Row, unknown>>>,
>(schema: SpreadsheetSchema<Row, Columns>): SpreadsheetQueryFields<Columns>;
export function createSpreadsheetQueryFields(
  source: unknown,
): Readonly<Record<string, RuntimeSpreadsheetQueryField>> {
  const columns = isSpreadsheetQueryFieldSchema(source) ? source.columns : source;

  if (typeof columns !== "object" || columns === null || Array.isArray(columns)) {
    throw new TypeError(
      "Spreadsheet query fields require a column record or record-backed schema.",
    );
  }

  return Object.fromEntries(
    Object.entries(columns).map(([name, column]) => {
      if (
        typeof column !== "object" ||
        column === null ||
        !("name" in column) ||
        !("index" in column) ||
        !("getValue" in column) ||
        typeof column.getValue !== "function"
      ) {
        throw new TypeError(
          "Spreadsheet query fields require a column record or record-backed schema.",
        );
      }

      return [name, createRuntimeSpreadsheetQueryField(column)];
    }),
  );
}
