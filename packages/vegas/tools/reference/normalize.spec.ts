import vm from "node:vm";

import { expect, test } from "vitest";

import { normalizeReferenceResult } from "./normalize";

test("preserves primitive values", () => {
  expect(normalizeReferenceResult("value")).toBe("value");
});

test("preserves structured values", () => {
  const value = {
    nested: [1, "value", null],
  };

  expect(normalizeReferenceResult(value)).toStrictEqual(value);
});

test("sorts object keys recursively", () => {
  expect(
    normalizeReferenceResult({
      z: {
        b: 2,
        a: 1,
      },
      a: "value",
    }),
  ).toEqual({
    a: "value",
    z: {
      a: 1,
      b: 2,
    },
  });
});

test("preserves array order", () => {
  expect(normalizeReferenceResult([{ b: 2, a: 1 }, "second", "third"])).toStrictEqual([
    { a: 1, b: 2 },
    "second",
    "third",
  ]);
});

test("normalizes arrays into the current realm", () => {
  const value = vm.runInNewContext(`[{ b: 2, a: 1 }]`);
  const normalized = normalizeReferenceResult(value);

  expect(Object.getPrototypeOf(normalized)).toBe(Array.prototype);
  expect(normalized).toStrictEqual([
    {
      a: 1,
      b: 2,
    },
  ]);
});
