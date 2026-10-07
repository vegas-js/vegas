import type { SpreadsheetStorageLocation } from "../storage/spreadsheet-storage-layout";
import { matchesSpreadsheetComparison } from "./spreadsheet-query-comparison";
import type { SpreadsheetQueryExpression } from "./spreadsheet-query-ir";

export type SpreadsheetQueryPushdownResult = "match" | "miss" | "unknown";

export function evaluateSpreadsheetQueryPushdown(
  physicalValues: readonly unknown[],
  expression: SpreadsheetQueryExpression,
  locate: (logicalIndex: number) => SpreadsheetStorageLocation,
): SpreadsheetQueryPushdownResult {
  switch (expression.kind) {
    case "equal":
    case "not-equal":
    case "less-than":
    case "less-than-or-equal":
    case "greater-than":
    case "greater-than-or-equal": {
      const location = locate(expression.column);

      if (location.kind === "payload") {
        return "unknown";
      }

      return matchesSpreadsheetComparison(
        physicalValues[location.physicalIndex],
        expression.kind,
        expression.value,
      )
        ? "match"
        : "miss";
    }

    case "and": {
      let hasUnknown = false;

      for (const candidate of expression.expressions) {
        const result = evaluateSpreadsheetQueryPushdown(physicalValues, candidate, locate);

        if (result === "miss") {
          return "miss";
        }

        if (result === "unknown") {
          hasUnknown = true;
        }
      }

      return hasUnknown ? "unknown" : "match";
    }

    case "or": {
      let hasUnknown = false;

      for (const candidate of expression.expressions) {
        const result = evaluateSpreadsheetQueryPushdown(physicalValues, candidate, locate);

        if (result === "match") {
          return "match";
        }

        if (result === "unknown") {
          hasUnknown = true;
        }
      }

      return hasUnknown ? "unknown" : "miss";
    }
  }
}
