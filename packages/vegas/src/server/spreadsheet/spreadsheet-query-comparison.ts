import type { SpreadsheetComparisonKind } from "./spreadsheet-query-ir";

export function compareSpreadsheetQueryValues(
  left: unknown,
  right: unknown,
  errorMessage: string,
): number {
  if (typeof left === "number" && typeof right === "number") {
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      throw new TypeError(errorMessage);
    }

    if (left === right) {
      return 0;
    }

    return left < right ? -1 : 1;
  }

  if (typeof left === "string" && typeof right === "string") {
    if (left === right) {
      return 0;
    }

    return left < right ? -1 : 1;
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    if (left === right) {
      return 0;
    }

    return left ? 1 : -1;
  }

  if (left instanceof Date && right instanceof Date) {
    const leftTime = left.getTime();
    const rightTime = right.getTime();

    if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
      throw new TypeError(errorMessage);
    }

    if (leftTime === rightTime) {
      return 0;
    }

    return leftTime < rightTime ? -1 : 1;
  }

  throw new TypeError(errorMessage);
}

export function matchesSpreadsheetComparison(
  left: unknown,
  kind: SpreadsheetComparisonKind,
  right: unknown,
): boolean {
  if (kind === "equal") {
    return Object.is(left, right);
  }

  if (kind === "not-equal") {
    return !Object.is(left, right);
  }

  const comparison = compareSpreadsheetQueryValues(
    left,
    right,
    "Spreadsheet query comparison values must be comparable.",
  );

  switch (kind) {
    case "less-than":
      return comparison < 0;
    case "less-than-or-equal":
      return comparison <= 0;
    case "greater-than":
      return comparison > 0;
    case "greater-than-or-equal":
      return comparison >= 0;
  }
}
