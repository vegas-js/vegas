import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createSpreadsheetColumn,
  createSpreadsheetQueryFields,
  createSpreadsheetRowCodec,
  createSpreadsheetSchema,
  createSpreadsheetStorageCodec,
  type SpreadsheetComparableQueryField,
} from "../server";

interface UserRow {
  readonly id: number;
  readonly name: string;
}

describe("spreadsheet schema composition", () => {
  test("reuse a typed column record across schema, query fields, and storage", () => {
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const columns = {
      id: createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id),
      name: createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name),
    };
    const schema = createSpreadsheetSchema(codec, columns);
    const fields = createSpreadsheetQueryFields(schema);
    const storage = createSpreadsheetStorageCodec(schema, {
      mode: "packed",
      key: schema.columns.id,
    });

    expectTypeOf(fields.id).toEqualTypeOf<SpreadsheetComparableQueryField<number>>();
    expectTypeOf(fields.name).toEqualTypeOf<SpreadsheetComparableQueryField<string>>();
    expect(fields.id.eq(1)).toStrictEqual({
      kind: "equal",
      column: 0,
      value: 1,
    });
    expect(storage.locate(0)).toStrictEqual({
      kind: "materialized",
      physicalIndex: 0,
    });
    expect(storage.locate(1)).toStrictEqual({
      kind: "payload",
      physicalIndex: 1,
      payloadIndex: 0,
    });
  });
});
