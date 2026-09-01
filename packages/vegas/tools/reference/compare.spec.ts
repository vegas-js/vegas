import { describe, expect, test } from "vitest";

import { compareReference } from "./compare";

describe("compareReference", () => {
  test("same primitive values are equal", () => {
    expect(compareReference("value", "value")).toEqual({
      equal: true,
    });
  });

  test("same nested objects are equal", () => {
    expect(
      compareReference(
        {
          value: {
            nested: [1, 2, 3],
          },
        },
        {
          value: {
            nested: [1, 2, 3],
          },
        },
      ),
    ).toEqual({
      equal: true,
    });
  });

  test("object property order does not affect equality", () => {
    expect(
      compareReference(
        {
          first: 1,
          second: 2,
        },
        {
          second: 2,
          first: 1,
        },
      ),
    ).toEqual({
      equal: true,
    });
  });

  test("different nested values are not equal", () => {
    const expected = {
      value: {
        nested: "before",
      },
    };
    const actual = {
      value: {
        nested: "after",
      },
    };

    expect(compareReference(expected, actual)).toEqual({
      equal: false,
      expected,
      actual,
    });
  });

  test("array order affects equality", () => {
    const expected = [1, 2, 3];
    const actual = [3, 2, 1];

    expect(compareReference(expected, actual)).toEqual({
      equal: false,
      expected,
      actual,
    });
  });
});
