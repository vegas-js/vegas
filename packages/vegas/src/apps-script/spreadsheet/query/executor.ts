import { matchesSpreadsheetComparison } from "./comparison";
import type { SpreadsheetQueryExpression } from "./expression";

export function matchesSpreadsheetQuery(
  values: readonly unknown[],
  expression: SpreadsheetQueryExpression,
): boolean {
  switch (expression.kind) {
    case "equal":
    case "not-equal":
    case "less-than":
    case "less-than-or-equal":
    case "greater-than":
    case "greater-than-or-equal":
      return matchesSpreadsheetComparison(
        values[expression.column],
        expression.kind,
        expression.value,
      );
    case "and":
      return expression.expressions.every((candidate) =>
        matchesSpreadsheetQuery(values, candidate),
      );
    case "or":
      return expression.expressions.some((candidate) => matchesSpreadsheetQuery(values, candidate));
  }
}
