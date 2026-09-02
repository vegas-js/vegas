import util from "node:util";

export type ReferenceComparison =
  | { equal: true }
  | {
      equal: false;
      expected: unknown;
      actual: unknown;
    };

export function compareReference(expected: unknown, actual: unknown): ReferenceComparison {
  if (util.isDeepStrictEqual(expected, actual)) {
    return { equal: true };
  }

  return {
    equal: false,
    expected,
    actual,
  };
}
