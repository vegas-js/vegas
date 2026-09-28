import { describe, expect, test } from "vitest";

import { matchesSpreadsheetQuery } from "./spreadsheet-query-executor";
import type { SpreadsheetQueryExpression } from "./spreadsheet-query-ir";

describe("matchesSpreadsheetQuery", () => {
  test("match equality expressions by raw column index", () => {
    const expression: SpreadsheetQueryExpression = {
      kind: "equal",
      column: 1,
      value: "Ada",
    };

    expect(matchesSpreadsheetQuery([1, "Ada"], expression)).toBe(true);
    expect(matchesSpreadsheetQuery([1, "Grace"], expression)).toBe(false);
  });

  test("match nested logical expressions", () => {
    const expression: SpreadsheetQueryExpression = {
      kind: "and",
      expressions: [
        {
          kind: "equal",
          column: 0,
          value: 1,
        },
        {
          kind: "or",
          expressions: [
            {
              kind: "equal",
              column: 1,
              value: "Ada",
            },
            {
              kind: "equal",
              column: 1,
              value: "Grace",
            },
          ],
        },
      ],
    };

    expect(matchesSpreadsheetQuery([1, "Ada"], expression)).toBe(true);
    expect(matchesSpreadsheetQuery([1, "Grace"], expression)).toBe(true);
    expect(matchesSpreadsheetQuery([2, "Ada"], expression)).toBe(false);
    expect(matchesSpreadsheetQuery([1, "Katherine"], expression)).toBe(false);
  });
});
