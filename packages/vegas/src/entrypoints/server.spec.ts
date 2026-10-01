import { describe, expect, expectTypeOf, test } from "vitest";

import { createSpreadsheetRowCodec, type SpreadsheetRowCodec } from "./server";

interface UserRow {
  readonly id: number;
  readonly name: string;
}

describe("createSpreadsheetRowCodec", () => {
  test("create a typed fixed-width row codec through the server entry", () => {
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );

    expectTypeOf(codec).toEqualTypeOf<SpreadsheetRowCodec<UserRow>>();
    expectTypeOf(codec.decode([1, "Ada"])).toEqualTypeOf<UserRow>();
    expect(codec.width).toBe(2);
    expect(codec.decode([1, "Ada"])).toStrictEqual({
      id: 1,
      name: "Ada",
    });
    expect(codec.encode({ id: 2, name: "Grace" })).toStrictEqual([2, "Grace"]);
  });

  test.each([0, -1, 1.5, Number.NaN])("reject invalid row width: %j", (width) => {
    expect(() =>
      createSpreadsheetRowCodec(
        width,
        (values) => values,
        (values) => values,
      ),
    ).toThrow("Spreadsheet row codec width must be a positive integer.");
  });

  test("reject rows that do not match the declared width", () => {
    const decodeMismatch = createSpreadsheetRowCodec(
      2,
      (values) => values,
      (values) => values,
    );
    const encodeMismatch = createSpreadsheetRowCodec(
      2,
      (values) => values,
      () => ["only-one-value"],
    );

    expect(() => decodeMismatch.decode(["only-one-value"])).toThrow(
      "Spreadsheet row codec decode expected 2 values, received 1.",
    );
    expect(() => encodeMismatch.encode(["ignored"])).toThrow(
      "Spreadsheet row codec encode expected 2 values, received 1.",
    );
  });

  test("copy encoded values before returning them", () => {
    const encoded = [1, "Ada"];
    const codec = createSpreadsheetRowCodec<undefined>(
      2,
      () => undefined,
      () => encoded,
    );

    const result = codec.encode(undefined);

    expect(result).toStrictEqual(encoded);
    expect(result).not.toBe(encoded);
  });
});
