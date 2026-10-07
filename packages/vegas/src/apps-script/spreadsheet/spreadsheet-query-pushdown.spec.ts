import { describe, expect, test } from "vitest";

import type { SpreadsheetQueryExpression } from "./spreadsheet-query-ir";
import { evaluateSpreadsheetQueryPushdown } from "./spreadsheet-query-pushdown";
import type { SpreadsheetStorageLocation } from "./spreadsheet-storage-layout";

function locate(logicalIndex: number): SpreadsheetStorageLocation {
  if (logicalIndex === 0) {
    return {
      kind: "materialized",
      physicalIndex: 0,
    };
  }

  if (logicalIndex === 2) {
    return {
      kind: "materialized",
      physicalIndex: 1,
    };
  }

  return {
    kind: "payload",
    physicalIndex: 2,
    payloadIndex: 0,
  };
}

describe("evaluateSpreadsheetQueryPushdown", () => {
  test("match and miss materialized equality without reading the payload", () => {
    const expression: SpreadsheetQueryExpression = {
      kind: "equal",
      column: 2,
      value: "active",
    };

    expect(evaluateSpreadsheetQueryPushdown([1, "active", "not-json"], expression, locate)).toBe(
      "match",
    );
    expect(evaluateSpreadsheetQueryPushdown([1, "inactive", "not-json"], expression, locate)).toBe(
      "miss",
    );
  });

  test("evaluate materialized comparison operators without reading the payload", () => {
    expect(
      evaluateSpreadsheetQueryPushdown(
        [1, "active", "not-json"],
        {
          kind: "not-equal",
          column: 2,
          value: "inactive",
        },
        locate,
      ),
    ).toBe("match");
    expect(
      evaluateSpreadsheetQueryPushdown(
        [1, "active", "not-json"],
        {
          kind: "greater-than-or-equal",
          column: 0,
          value: 1,
        },
        locate,
      ),
    ).toBe("match");
    expect(
      evaluateSpreadsheetQueryPushdown(
        [1, "active", "not-json"],
        {
          kind: "less-than",
          column: 0,
          value: 1,
        },
        locate,
      ),
    ).toBe("miss");
  });

  test("return unknown for payload equality", () => {
    const expression: SpreadsheetQueryExpression = {
      kind: "equal",
      column: 1,
      value: "Ada",
    };

    expect(evaluateSpreadsheetQueryPushdown([1, "active", "not-json"], expression, locate)).toBe(
      "unknown",
    );
  });

  test("return unknown for payload relational comparison", () => {
    const expression: SpreadsheetQueryExpression = {
      kind: "greater-than",
      column: 1,
      value: "Ada",
    };

    expect(evaluateSpreadsheetQueryPushdown([1, "active", "not-json"], expression, locate)).toBe(
      "unknown",
    );
  });

  test("short-circuit and when a materialized predicate misses", () => {
    const expression: SpreadsheetQueryExpression = {
      kind: "and",
      expressions: [
        {
          kind: "equal",
          column: 1,
          value: "Ada",
        },
        {
          kind: "equal",
          column: 2,
          value: "active",
        },
      ],
    };

    expect(evaluateSpreadsheetQueryPushdown([1, "inactive", "not-json"], expression, locate)).toBe(
      "miss",
    );
    expect(evaluateSpreadsheetQueryPushdown([1, "active", "not-json"], expression, locate)).toBe(
      "unknown",
    );
  });

  test("short-circuit or when a materialized predicate matches", () => {
    const expression: SpreadsheetQueryExpression = {
      kind: "or",
      expressions: [
        {
          kind: "equal",
          column: 1,
          value: "Ada",
        },
        {
          kind: "equal",
          column: 2,
          value: "active",
        },
      ],
    };

    expect(evaluateSpreadsheetQueryPushdown([1, "active", "not-json"], expression, locate)).toBe(
      "match",
    );
    expect(evaluateSpreadsheetQueryPushdown([1, "inactive", "not-json"], expression, locate)).toBe(
      "unknown",
    );
  });
});
