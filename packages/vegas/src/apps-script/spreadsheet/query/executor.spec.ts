import { describe, expect, test } from "vitest";

import { matchesSpreadsheetQuery } from "./executor";
import type { SpreadsheetQueryExpression } from "./expression";

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

  test.each([
    ["not-equal", 2, true],
    ["not-equal", 1, false],
    ["less-than", 0, true],
    ["less-than", 1, false],
    ["less-than-or-equal", 1, true],
    ["less-than-or-equal", 2, false],
    ["greater-than", 2, true],
    ["greater-than", 1, false],
    ["greater-than-or-equal", 1, true],
    ["greater-than-or-equal", 0, false],
  ] as const)("match %s comparison against %s", (kind, value, expected) => {
    const expression: SpreadsheetQueryExpression = {
      kind,
      column: 0,
      value: 1,
    };

    expect(matchesSpreadsheetQuery([value], expression)).toBe(expected);
  });

  test("compare strings, booleans, and dates without coercion", () => {
    expect(
      matchesSpreadsheetQuery(["Ada"], {
        kind: "less-than",
        column: 0,
        value: "Grace",
      }),
    ).toBe(true);
    expect(
      matchesSpreadsheetQuery([false], {
        kind: "less-than",
        column: 0,
        value: true,
      }),
    ).toBe(true);
    expect(
      matchesSpreadsheetQuery([new Date(0)], {
        kind: "less-than-or-equal",
        column: 0,
        value: new Date(0),
      }),
    ).toBe(true);
  });

  test("reject incomparable relational values", () => {
    expect(() =>
      matchesSpreadsheetQuery(["1"], {
        kind: "less-than",
        column: 0,
        value: 2,
      }),
    ).toThrow("Spreadsheet query comparison values must be comparable.");
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
