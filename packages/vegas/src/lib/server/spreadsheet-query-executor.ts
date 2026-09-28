import type { SpreadsheetQueryExpression } from "./spreadsheet-query-ir";

export function matchesSpreadsheetQuery(
  values: readonly unknown[],
  expression: SpreadsheetQueryExpression,
): boolean {
  switch (expression.kind) {
    case "equal":
      return Object.is(values[expression.column], expression.value);
    case "and":
      return expression.expressions.every((candidate) =>
        matchesSpreadsheetQuery(values, candidate),
      );
    case "or":
      return expression.expressions.some((candidate) => matchesSpreadsheetQuery(values, candidate));
  }
}
