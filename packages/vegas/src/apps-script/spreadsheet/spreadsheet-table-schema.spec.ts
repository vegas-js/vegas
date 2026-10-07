import { describe, expect, expectTypeOf, test, vi } from "vitest";

import { createSpreadsheetRepository } from "./spreadsheet-repository";
import { createSpreadsheetRowCodec } from "./spreadsheet-row-codec";
import { createSpreadsheetColumn, createSpreadsheetSchema } from "./spreadsheet-schema";
import { createSpreadsheetStorageCodec } from "./spreadsheet-storage-codec";
import { createSpreadsheetTable, type SpreadsheetTable } from "./spreadsheet-table";

interface UserRow {
  readonly id: number;
  readonly name: string;
}

function createSheet(values: unknown[][]): GoogleAppsScript.Spreadsheet.Sheet {
  return {
    getLastRow: vi.fn(() => values.length),
    getRange: vi.fn(() => ({
      getValues: vi.fn(() => values),
      setValues: vi.fn(),
    })),
  } as unknown as GoogleAppsScript.Spreadsheet.Sheet;
}

function createUserSchema() {
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

  return createSpreadsheetSchema(codec, columns);
}

describe("createSpreadsheetTable with schema", () => {
  test("use the schema row codec", () => {
    const schema = createUserSchema();
    const table = createSpreadsheetTable(createSheet([[1, "Ada"]]), schema);

    expectTypeOf(table).toEqualTypeOf<SpreadsheetTable<UserRow>>();
    expect(table.readAll()).toStrictEqual([
      {
        id: 1,
        name: "Ada",
      },
    ]);
  });

  test("compose a schema with an explicit storage codec", () => {
    const schema = createUserSchema();
    const storageCodec = createSpreadsheetStorageCodec(schema, {
      mode: "packed",
      key: schema.columns.id,
    });
    const table = createSpreadsheetTable(createSheet([[1, '["Ada"]']]), schema, {
      storageCodec,
    });

    expect(table.readAll()).toStrictEqual([
      {
        id: 1,
        name: "Ada",
      },
    ]);
  });

  test("require repository key columns to belong to the table schema", () => {
    const schema = createUserSchema();
    const table = createSpreadsheetTable(createSheet([]), schema);
    const externalId = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.name.length);

    expect(() => createSpreadsheetRepository(table, externalId)).toThrow(
      'Spreadsheet repository key column "id" must belong to the table schema.',
    );
    expect(() => createSpreadsheetRepository(table, schema.columns.id)).not.toThrow();
  });
});
