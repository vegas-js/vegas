import { describe, expect, expectTypeOf, test } from "vitest";

import { createSpreadsheetRowCodec } from "../row-codec";
import { createSpreadsheetColumn, createSpreadsheetSchema } from "../schema";
import {
  createSpreadsheetQueryFields,
  type SpreadsheetComparableQueryField,
  type SpreadsheetQueryField,
} from "./fields";

interface UserRow {
  readonly id: number;
  readonly name: string;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly metadata: {
    readonly role: string;
  };
}

function createColumns() {
  return {
    id: createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id),
    name: createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name),
    active: createSpreadsheetColumn<UserRow, boolean>("active", 2, (row) => row.active),
    createdAt: createSpreadsheetColumn<UserRow, Date>("createdAt", 3, (row) => row.createdAt),
    metadata: createSpreadsheetColumn<UserRow, UserRow["metadata"]>(
      "metadata",
      4,
      (row) => row.metadata,
    ),
  };
}

describe("createSpreadsheetQueryFields", () => {
  test("create typed comparison fields from spreadsheet columns", () => {
    const fields = createSpreadsheetQueryFields(createColumns());

    expectTypeOf(fields.id).toEqualTypeOf<SpreadsheetComparableQueryField<number>>();
    expectTypeOf(fields.name).toEqualTypeOf<SpreadsheetComparableQueryField<string>>();
    expectTypeOf(fields.active).toEqualTypeOf<SpreadsheetComparableQueryField<boolean>>();
    expectTypeOf(fields.createdAt).toEqualTypeOf<SpreadsheetComparableQueryField<Date>>();
    expectTypeOf(fields.metadata).toEqualTypeOf<SpreadsheetQueryField<UserRow["metadata"]>>();
  });

  test("create typed comparison fields from a record-backed schema", () => {
    const columns = createColumns();
    const codec = createSpreadsheetRowCodec<UserRow>(
      5,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
        active: Boolean(values[2]),
        createdAt: new Date(String(values[3])),
        metadata: { role: String(values[4]) },
      }),
      (row) => [row.id, row.name, row.active, row.createdAt, row.metadata],
    );
    const schema = createSpreadsheetSchema(codec, columns);
    const fields = createSpreadsheetQueryFields(schema);

    expectTypeOf(fields.id).toEqualTypeOf<SpreadsheetComparableQueryField<number>>();
    expectTypeOf(fields.metadata).toEqualTypeOf<SpreadsheetQueryField<UserRow["metadata"]>>();
    expect(fields.id.eq(42)).toStrictEqual({
      kind: "equal",
      column: 0,
      value: 42,
    });
  });

  test("lower field methods directly to data-only query IR", () => {
    const fields = createSpreadsheetQueryFields(createColumns());

    expect([
      fields.id.eq(42),
      fields.id.ne(0),
      fields.id.lt(100),
      fields.id.lte(42),
      fields.id.gt(1),
      fields.id.gte(18),
    ]).toStrictEqual([
      { kind: "equal", column: 0, value: 42 },
      { kind: "not-equal", column: 0, value: 0 },
      { kind: "less-than", column: 0, value: 100 },
      { kind: "less-than-or-equal", column: 0, value: 42 },
      { kind: "greater-than", column: 0, value: 1 },
      { kind: "greater-than-or-equal", column: 0, value: 18 },
    ]);
  });

  test("lower field ordering directly to data-only order descriptors", () => {
    const fields = createSpreadsheetQueryFields(createColumns());

    expect(fields.name.asc()).toStrictEqual({
      column: 1,
      direction: "asc",
    });
    expect(fields.id.desc()).toStrictEqual({
      column: 0,
      direction: "desc",
    });
  });

  test("preserve value types for equality on non-comparable fields", () => {
    const fields = createSpreadsheetQueryFields(createColumns());
    const metadata = {
      role: "admin",
    };

    expect(fields.metadata.eq(metadata)).toStrictEqual({
      kind: "equal",
      column: 4,
      value: metadata,
    });
    expect(fields.metadata.ne(metadata)).toStrictEqual({
      kind: "not-equal",
      column: 4,
      value: metadata,
    });
  });

  test("use record keys independently from spreadsheet column names", () => {
    const identifier = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const fields = createSpreadsheetQueryFields({
      identifier,
    });

    expect(fields.identifier.eq(7)).toStrictEqual({
      kind: "equal",
      column: 0,
      value: 7,
    });
  });

  test("create an independent field record", () => {
    const columns = createColumns();
    const fields = createSpreadsheetQueryFields(columns);

    expect(fields).not.toBe(columns);
    expect(Object.keys(fields)).toStrictEqual(["id", "name", "active", "createdAt", "metadata"]);
  });
});
