import { describe, expect, expectTypeOf, test, vi } from "vitest";

import { createSpreadsheetQuery } from "./query/spreadsheet-query";
import {
  createSpreadsheetQueryFields,
  type SpreadsheetComparableQueryField,
} from "./query/spreadsheet-query-fields";
import {
  createSpreadsheetRepository,
  type SpreadsheetRepository,
} from "./repository/spreadsheet-repository";
import { createSpreadsheetRowCodec } from "./spreadsheet-row-codec";
import { createSpreadsheetColumn, createSpreadsheetSchema } from "./spreadsheet-schema";
import { createSpreadsheetTable, type SpreadsheetTable } from "./spreadsheet-table";
import { createSpreadsheetStorageCodec } from "./storage/spreadsheet-storage-codec";

interface UserRow {
  readonly id: number;
  readonly name: string;
}

describe("spreadsheet schema composition", () => {
  test("compose query, storage, table, and repository from one schema", () => {
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
    const values = [
      [1, '["Ada"]'],
      [2, '["Grace"]'],
    ];
    const sheet = {
      getLastRow: vi.fn(() => values.length),
      getRange: vi.fn(() => ({
        getValues: vi.fn(() => values),
        setValues: vi.fn(),
      })),
    } as unknown as GoogleAppsScript.Spreadsheet.Sheet;
    const table = createSpreadsheetTable(sheet, schema, {
      storageCodec: storage,
    });
    const repository = createSpreadsheetRepository(table, schema.columns.id);
    const query = createSpreadsheetQuery(fields)
      .where(($) => $.id.gte(2))
      .orderBy(($) => $.name.asc());

    expectTypeOf(fields.id).toEqualTypeOf<SpreadsheetComparableQueryField<number>>();
    expectTypeOf(fields.name).toEqualTypeOf<SpreadsheetComparableQueryField<string>>();
    expectTypeOf(table).toEqualTypeOf<SpreadsheetTable<UserRow>>();
    expectTypeOf(repository).toEqualTypeOf<SpreadsheetRepository<UserRow, number>>();
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
    expect(table.execute(query)).toStrictEqual([
      {
        id: 2,
        name: "Grace",
      },
    ]);
    expect(repository.findByKey(1)).toStrictEqual({
      id: 1,
      name: "Ada",
    });
  });
});
