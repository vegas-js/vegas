import { describe, expect, expectTypeOf, test } from "vitest";

import { createSpreadsheetRowCodec } from "../spreadsheet-row-codec";
import { createSpreadsheetColumn, createSpreadsheetSchema } from "../spreadsheet-schema";
import {
  createSpreadsheetStorageLayout,
  type SpreadsheetStorageLayout,
  type SpreadsheetStorageLocation,
} from "./spreadsheet-storage-layout";

interface UserRow {
  readonly id: number;
  readonly name: string;
  readonly status: string;
  readonly createdAt: string;
}

function createUserSchema() {
  const codec = createSpreadsheetRowCodec<UserRow>(
    4,
    (values) => ({
      id: Number(values[0]),
      name: String(values[1]),
      status: String(values[2]),
      createdAt: String(values[3]),
    }),
    (row) => [row.id, row.name, row.status, row.createdAt],
  );
  const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
  const name = createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name);
  const status = createSpreadsheetColumn<UserRow, string>("status", 2, (row) => row.status);
  const createdAt = createSpreadsheetColumn<UserRow, string>(
    "createdAt",
    3,
    (row) => row.createdAt,
  );
  const schema = createSpreadsheetSchema(codec, [id, name, status, createdAt]);

  return {
    schema,
    id,
    name,
    status,
    createdAt,
  };
}

describe("createSpreadsheetStorageLayout", () => {
  test("map logical columns directly in columns mode", () => {
    const { schema } = createUserSchema();
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "columns",
    });

    expectTypeOf(layout).toEqualTypeOf<SpreadsheetStorageLayout>();
    expect(layout.mode).toBe("columns");
    expect(layout.logicalWidth).toBe(4);
    expect(layout.physicalWidth).toBe(4);
    expect(layout.locate(0)).toStrictEqual({
      kind: "materialized",
      physicalIndex: 0,
    });
    expect(layout.locate(3)).toStrictEqual({
      kind: "materialized",
      physicalIndex: 3,
    });
  });

  test("snapshot schema width when creating a layout", () => {
    let width = 2;
    const codec = {
      get width() {
        return width;
      },
      decode: (values: readonly unknown[]) => values,
      encode: (values: readonly unknown[]) => values,
    };
    const first = createSpreadsheetColumn<readonly unknown[], unknown>("first", 0, (row) => row[0]);
    const second = createSpreadsheetColumn<readonly unknown[], unknown>(
      "second",
      1,
      (row) => row[1],
    );
    const schema = createSpreadsheetSchema(codec, [first, second]);
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "columns",
    });

    width = 1;

    expect(layout.logicalWidth).toBe(2);
    expect(layout.physicalWidth).toBe(2);
    expect(layout.locate(1)).toStrictEqual({
      kind: "materialized",
      physicalIndex: 1,
    });
    expect(() => layout.locate(2)).toThrow(
      "Spreadsheet storage logical column index 2 must be between 0 and 1.",
    );
  });

  test("do not expose mutable layout mappings", () => {
    const { schema } = createUserSchema();
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "columns",
    });
    const location = layout.locate(0);

    expect(Reflect.set(location, "physicalIndex", 3)).toBe(true);
    expect(layout.locate(0)).toStrictEqual({
      kind: "materialized",
      physicalIndex: 0,
    });
  });

  test("store the key separately and pack remaining columns into a tuple payload", () => {
    const { schema, id } = createUserSchema();
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "packed",
      key: id,
    });

    expect(layout.mode).toBe("packed");
    expect(layout.logicalWidth).toBe(4);
    expect(layout.physicalWidth).toBe(2);
    expect(layout.locate(0)).toStrictEqual({
      kind: "materialized",
      physicalIndex: 0,
    });
    expect(layout.locate(1)).toStrictEqual({
      kind: "payload",
      physicalIndex: 1,
      payloadIndex: 0,
    });
    expect(layout.locate(2)).toStrictEqual({
      kind: "payload",
      physicalIndex: 1,
      payloadIndex: 1,
    });
    expect(layout.locate(3)).toStrictEqual({
      kind: "payload",
      physicalIndex: 1,
      payloadIndex: 2,
    });
  });

  test("materialize indexed columns before the packed payload", () => {
    const { schema, id, status, createdAt } = createUserSchema();
    const materialize = [status, createdAt];
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "indexed-packed",
      key: id,
      materialize,
    });

    materialize.length = 0;

    expect(layout.mode).toBe("indexed-packed");
    expect(layout.logicalWidth).toBe(4);
    expect(layout.physicalWidth).toBe(4);
    expect(layout.locate(0)).toStrictEqual({
      kind: "materialized",
      physicalIndex: 0,
    });
    expect(layout.locate(2)).toStrictEqual({
      kind: "materialized",
      physicalIndex: 1,
    });
    expect(layout.locate(3)).toStrictEqual({
      kind: "materialized",
      physicalIndex: 2,
    });
    expect(layout.locate(1)).toStrictEqual({
      kind: "payload",
      physicalIndex: 3,
      payloadIndex: 0,
    });
  });

  test("return a stable storage location type", () => {
    const { schema, id } = createUserSchema();
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "packed",
      key: id,
    });

    expectTypeOf(layout.locate(1)).toEqualTypeOf<SpreadsheetStorageLocation>();
  });

  test("reject storage columns outside the schema", () => {
    const { schema, id } = createUserSchema();
    const external = createSpreadsheetColumn<UserRow, string>("external", 1, (row) => row.name);

    expect(() =>
      createSpreadsheetStorageLayout(schema, {
        mode: "packed",
        key: external,
      }),
    ).toThrow('Spreadsheet storage key column "external" must belong to the schema.');

    expect(() =>
      createSpreadsheetStorageLayout(schema, {
        mode: "indexed-packed",
        key: id,
        materialize: [external],
      }),
    ).toThrow('Spreadsheet storage materialized column "external" must belong to the schema.');
  });

  test("reject duplicate materialized logical columns", () => {
    const { schema, id, status } = createUserSchema();

    expect(() =>
      createSpreadsheetStorageLayout(schema, {
        mode: "indexed-packed",
        key: id,
        materialize: [status, status],
      }),
    ).toThrow(
      "Spreadsheet storage logical column index 2 must not be materialized more than once.",
    );

    expect(() =>
      createSpreadsheetStorageLayout(schema, {
        mode: "indexed-packed",
        key: id,
        materialize: [id],
      }),
    ).toThrow(
      "Spreadsheet storage logical column index 0 must not be materialized more than once.",
    );
  });

  test("reject packed layouts without payload columns", () => {
    const { schema, id, name, status, createdAt } = createUserSchema();

    expect(() =>
      createSpreadsheetStorageLayout(schema, {
        mode: "indexed-packed",
        key: id,
        materialize: [name, status, createdAt],
      }),
    ).toThrow("Spreadsheet packed storage must leave at least one column in the payload.");
  });

  test.each([-1, 4, 1.5, Number.NaN])("reject invalid logical column index: %s", (index) => {
    const { schema } = createUserSchema();
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "columns",
    });

    expect(() => layout.locate(index)).toThrow(
      `Spreadsheet storage logical column index ${index} must be between 0 and 3.`,
    );
  });
});
