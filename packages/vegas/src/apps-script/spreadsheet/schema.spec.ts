import { describe, expect, expectTypeOf, test } from "vitest";

import { createSpreadsheetRowCodec } from "./row-codec";
import {
  createSpreadsheetColumn,
  createSpreadsheetSchema,
  type SpreadsheetColumn,
  type SpreadsheetSchema,
} from "./schema";

interface UserRow {
  readonly id: number;
  readonly name: string;
}

describe("createSpreadsheetSchema", () => {
  test("describe named columns on top of a row codec", () => {
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const name = createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name);
    const schema = createSpreadsheetSchema(codec, [id, name]);

    expectTypeOf(id).toEqualTypeOf<SpreadsheetColumn<UserRow, number>>();
    expectTypeOf(schema).toEqualTypeOf<SpreadsheetSchema<UserRow>>();
    expect(id.getValue({ id: 1, name: "Ada" })).toBe(1);
    expect(schema.codec).toBe(codec);
    expect(schema.columns).toStrictEqual([id, name]);
    expect(schema.columnList).toStrictEqual([id, name]);
    expect(schema.getColumn("id")).toBe(id);
    expect(schema.getColumn("missing")).toBeUndefined();
  });

  test("accept a shared column record", () => {
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const name = createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name);
    const columns = {
      primaryKey: id,
      displayName: name,
    };
    const schema = createSpreadsheetSchema(codec, columns);

    expectTypeOf(schema).toEqualTypeOf<SpreadsheetSchema<UserRow, typeof columns>>();
    expectTypeOf(schema.columns.primaryKey).toEqualTypeOf<SpreadsheetColumn<UserRow, number>>();
    expectTypeOf(schema.columns.displayName).toEqualTypeOf<SpreadsheetColumn<UserRow, string>>();
    expect(schema.columns).toStrictEqual(columns);
    expect(schema.columns).not.toBe(columns);
    expect(schema.columnList).toStrictEqual([id, name]);
    expect(schema.getColumn("id")).toBe(id);
    expect(schema.getColumn("name")).toBe(name);
  });

  test("copy column records supplied by the caller", () => {
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const replacement = createSpreadsheetColumn<UserRow, number>("replacement", 0, (row) => row.id);
    const columns = {
      id,
    };
    const schema = createSpreadsheetSchema(codec, columns);

    columns.id = replacement;

    expect(schema.columns.id).toBe(id);
    expect(schema.columnList).toStrictEqual([id]);
  });

  test("copy column definitions supplied by the caller", () => {
    const codec = createSpreadsheetRowCodec(
      1,
      (values) => values,
      (values) => values,
    );
    const column = createSpreadsheetColumn<readonly unknown[], unknown>(
      "value",
      0,
      (row) => row[0],
    );
    const columns = [column];
    const schema = createSpreadsheetSchema(codec, columns);

    columns.length = 0;

    expect(schema.columns).toStrictEqual([column]);
    expect(schema.columnList).toStrictEqual([column]);
  });

  test.each([-1, 1.5, Number.NaN])("reject invalid column index: %s", (index) => {
    expect(() => createSpreadsheetColumn("value", index, (row: unknown) => row)).toThrow(
      "Spreadsheet column index must be a non-negative integer.",
    );
  });

  test("reject an empty column name", () => {
    expect(() => createSpreadsheetColumn("", 0, (row: unknown) => row)).toThrow(
      "Spreadsheet column name must not be empty.",
    );
  });

  test.each([-1, 1.5, Number.NaN])(
    "reject invalid column index supplied directly to a schema: %s",
    (index) => {
      const codec = createSpreadsheetRowCodec(
        1,
        (values) => values,
        (values) => values,
      );
      const column: SpreadsheetColumn<readonly unknown[], unknown> = {
        name: "value",
        index,
        getValue: (row) => row[0],
      };

      expect(() => createSpreadsheetSchema(codec, [column])).toThrow(
        "Spreadsheet column index must be a non-negative integer.",
      );
    },
  );

  test("reject an empty column name supplied directly to a schema", () => {
    const codec = createSpreadsheetRowCodec(
      1,
      (values) => values,
      (values) => values,
    );
    const column: SpreadsheetColumn<readonly unknown[], unknown> = {
      name: "",
      index: 0,
      getValue: (row) => row[0],
    };

    expect(() => createSpreadsheetSchema(codec, [column])).toThrow(
      "Spreadsheet column name must not be empty.",
    );
  });

  test.each([0, -1, 1.5, Number.NaN])(
    "reject invalid row codec width supplied directly to a schema: %s",
    (width) => {
      const codec = {
        width,
        decode: (values: readonly unknown[]) => values,
        encode: (values: readonly unknown[]) => values,
      };

      expect(() => createSpreadsheetSchema(codec, [])).toThrow(
        "Spreadsheet row codec width must be a positive integer.",
      );
    },
  );

  test("reject columns beyond the row codec width", () => {
    const codec = createSpreadsheetRowCodec(
      1,
      (values) => values,
      (values) => values,
    );
    const column = createSpreadsheetColumn<readonly unknown[], unknown>(
      "value",
      1,
      (row) => row[0],
    );

    expect(() => createSpreadsheetSchema(codec, [column])).toThrow(
      'Spreadsheet column "value" index 1 exceeds row codec width 1.',
    );
  });

  test("reject duplicate column names", () => {
    const codec = createSpreadsheetRowCodec(
      2,
      (values) => values,
      (values) => values,
    );
    const first = createSpreadsheetColumn<readonly unknown[], unknown>("value", 0, (row) => row[0]);
    const second = createSpreadsheetColumn<readonly unknown[], unknown>(
      "value",
      1,
      (row) => row[1],
    );

    expect(() => createSpreadsheetSchema(codec, [first, second])).toThrow(
      'Spreadsheet column name "value" must be unique.',
    );
  });

  test("reject duplicate column indexes", () => {
    const codec = createSpreadsheetRowCodec(
      2,
      (values) => values,
      (values) => values,
    );
    const first = createSpreadsheetColumn<readonly unknown[], unknown>("first", 0, (row) => row[0]);
    const second = createSpreadsheetColumn<readonly unknown[], unknown>(
      "second",
      0,
      (row) => row[0],
    );

    expect(() => createSpreadsheetSchema(codec, [first, second])).toThrow(
      "Spreadsheet column index 0 must be unique.",
    );
  });
});
