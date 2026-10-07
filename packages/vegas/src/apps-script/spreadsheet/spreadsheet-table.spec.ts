import { describe, expect, expectTypeOf, test, vi } from "vitest";

import { spreadsheetAnd, spreadsheetEq } from "./query/spreadsheet-query-ir";
import { createSpreadsheetRowCodec } from "./spreadsheet-row-codec";
import { createSpreadsheetColumn, createSpreadsheetSchema } from "./spreadsheet-schema";
import { createSpreadsheetTable, type SpreadsheetTable } from "./spreadsheet-table";
import { createSpreadsheetStorageCodec } from "./storage/spreadsheet-storage-codec";
import {
  createSpreadsheetStorageLayout,
  type SpreadsheetStorageLocation,
} from "./storage/spreadsheet-storage-layout";

interface UserRow {
  readonly id: number;
  readonly name: string;
}

interface PackedUserRow {
  readonly id: number;
  readonly name: string;
  readonly status: string;
}

function createPackedUserStorage() {
  const codec = createSpreadsheetRowCodec<PackedUserRow>(
    3,
    (values) => ({
      id: Number(values[0]),
      name: String(values[1]),
      status: String(values[2]),
    }),
    (row) => [row.id, row.name, row.status],
  );
  const id = createSpreadsheetColumn<PackedUserRow, number>("id", 0, (row) => row.id);
  const name = createSpreadsheetColumn<PackedUserRow, string>("name", 1, (row) => row.name);
  const status = createSpreadsheetColumn<PackedUserRow, string>("status", 2, (row) => row.status);
  const schema = createSpreadsheetSchema(codec, [id, name, status]);
  const layout = createSpreadsheetStorageLayout(schema, {
    mode: "packed",
    key: id,
  });

  return {
    codec,
    id,
    name,
    status,
    schema,
    storageCodec: createSpreadsheetStorageCodec(layout),
  };
}

function createIndexedPackedUserStorage() {
  const storage = createPackedUserStorage();
  const layout = createSpreadsheetStorageLayout(storage.schema, {
    mode: "indexed-packed",
    key: storage.id,
    materialize: [storage.status],
  });

  return {
    ...storage,
    storageCodec: createSpreadsheetStorageCodec(layout),
  };
}

function createSheet(values: unknown[][], lastRow = values.length) {
  const getValues = vi.fn(() => values);
  const setValues = vi.fn();
  const getRange = vi.fn(() => ({ getValues, setValues }));
  const getLastRow = vi.fn(() => lastRow);
  const sheet = {
    getLastRow,
    getRange,
  } as unknown as GoogleAppsScript.Spreadsheet.Sheet;

  return {
    sheet,
    getLastRow,
    getRange,
    getValues,
    setValues,
  };
}

describe("createSpreadsheetTable", () => {
  test("read and decode all rows", () => {
    const source = createSheet([
      [1, "Ada"],
      [2, "Grace"],
    ]);
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const table = createSpreadsheetTable(source.sheet, codec);

    expectTypeOf(table).toEqualTypeOf<SpreadsheetTable<UserRow>>();
    expect(table.readAll()).toStrictEqual([
      { id: 1, name: "Ada" },
      { id: 2, name: "Grace" },
    ]);
    expect(source.getLastRow).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledWith(1, 1, 2, 2);
    expect(source.getValues).toHaveBeenCalledOnce();
  });

  test("read from a configured table origin", () => {
    const source = createSheet(
      [
        [1, "Ada"],
        [2, "Grace"],
      ],
      3,
    );
    const codec = createSpreadsheetRowCodec(
      2,
      (values) => values,
      (values) => values,
    );
    const table = createSpreadsheetTable(source.sheet, codec, {
      startRow: 2,
      startColumn: 3,
    });

    expect(table.readAll()).toStrictEqual([
      [1, "Ada"],
      [2, "Grace"],
    ]);
    expect(source.getRange).toHaveBeenCalledWith(2, 3, 2, 2);
  });

  test("query raw rows before decoding matching values", () => {
    const source = createSheet([
      [1, "Ada"],
      [2, "Grace"],
      [3, "Katherine"],
    ]);
    const decode = vi.fn((values: readonly unknown[]) => ({
      id: Number(values[0]),
      name: String(values[1]),
    }));
    const codec = createSpreadsheetRowCodec<UserRow>(2, decode, (row) => [row.id, row.name]);
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const name = createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name);
    const table = createSpreadsheetTable(source.sheet, codec);
    const expression = spreadsheetAnd(spreadsheetEq(id, 2), spreadsheetEq(name, "Grace"));

    expect(table.query(expression)).toStrictEqual([{ id: 2, name: "Grace" }]);
    expect(source.getLastRow).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledWith(1, 1, 3, 2);
    expect(source.getValues).toHaveBeenCalledOnce();
    expect(decode).toHaveBeenCalledOnce();
    expect(decode).toHaveBeenCalledWith([2, "Grace"]);
  });

  test("return no query rows without requesting a range when the table is empty", () => {
    const source = createSheet([], 1);
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const table = createSpreadsheetTable(source.sheet, codec, {
      startRow: 2,
    });

    expect(table.query(spreadsheetEq(id, 1))).toStrictEqual([]);
    expect(source.getLastRow).toHaveBeenCalledOnce();
    expect(source.getRange).not.toHaveBeenCalled();
    expect(source.getValues).not.toHaveBeenCalled();
  });

  test("read packed rows using the physical storage width", () => {
    const source = createSheet([
      [1, '["Ada","active"]'],
      [2, '["Grace","inactive"]'],
    ]);
    const storage = createPackedUserStorage();
    const table = createSpreadsheetTable(source.sheet, storage.codec, {
      storageCodec: storage.storageCodec,
    });

    expect(table.readAll()).toStrictEqual([
      { id: 1, name: "Ada", status: "active" },
      { id: 2, name: "Grace", status: "inactive" },
    ]);
    expect(source.getRange).toHaveBeenCalledWith(1, 1, 2, 2);
  });

  test("query packed rows by logical column index", () => {
    const source = createSheet([
      [1, '["Ada","active"]'],
      [2, '["Grace","inactive"]'],
    ]);
    const storage = createPackedUserStorage();
    const decode = vi.fn((values: readonly unknown[]) => storage.codec.decode(values));
    const codec = createSpreadsheetRowCodec<PackedUserRow>(storage.codec.width, decode, (row) => [
      row.id,
      row.name,
      row.status,
    ]);
    const table = createSpreadsheetTable(source.sheet, codec, {
      storageCodec: storage.storageCodec,
    });

    expect(table.query(spreadsheetEq(storage.name, "Grace"))).toStrictEqual([
      { id: 2, name: "Grace", status: "inactive" },
    ]);
    expect(source.getRange).toHaveBeenCalledWith(1, 1, 2, 2);
    expect(decode).toHaveBeenCalledOnce();
    expect(decode).toHaveBeenCalledWith([2, "Grace", "inactive"]);
  });

  test("skip packed payload decoding when a materialized predicate misses", () => {
    const source = createSheet([
      [1, "active", '["Ada"]'],
      [2, "inactive", "invalid-json"],
      [3, "active", '["Katherine"]'],
    ]);
    const storage = createIndexedPackedUserStorage();
    const decodeStorage = vi.fn((values: readonly unknown[]) =>
      storage.storageCodec.decode(values),
    );
    const table = createSpreadsheetTable(source.sheet, storage.codec, {
      storageCodec: {
        ...storage.storageCodec,
        decode: decodeStorage,
      },
    });

    expect(table.query(spreadsheetEq(storage.status, "active"))).toStrictEqual([
      { id: 1, name: "Ada", status: "active" },
      { id: 3, name: "Katherine", status: "active" },
    ]);
    expect(source.getRange).toHaveBeenCalledWith(1, 1, 3, 3);
    expect(decodeStorage).toHaveBeenCalledTimes(2);
    expect(decodeStorage).not.toHaveBeenCalledWith([2, "inactive", "invalid-json"]);
  });

  test("use materialized predicates to reject rows before evaluating payload predicates", () => {
    const source = createSheet([
      [1, "active", '["Ada"]'],
      [2, "inactive", "invalid-json"],
      [3, "active", '["Katherine"]'],
    ]);
    const storage = createIndexedPackedUserStorage();
    const decodeStorage = vi.fn((values: readonly unknown[]) =>
      storage.storageCodec.decode(values),
    );
    const table = createSpreadsheetTable(source.sheet, storage.codec, {
      storageCodec: {
        ...storage.storageCodec,
        decode: decodeStorage,
      },
    });
    const expression = spreadsheetAnd(
      spreadsheetEq(storage.name, "Ada"),
      spreadsheetEq(storage.status, "active"),
    );

    expect(table.query(expression)).toStrictEqual([{ id: 1, name: "Ada", status: "active" }]);
    expect(decodeStorage).toHaveBeenCalledTimes(2);
    expect(decodeStorage).not.toHaveBeenCalledWith([2, "inactive", "invalid-json"]);
  });

  test("append and update packed rows using the physical storage width", () => {
    const source = createSheet([
      [1, '["Ada","active"]'],
      [2, '["Grace","inactive"]'],
    ]);
    const storage = createPackedUserStorage();
    const table = createSpreadsheetTable(source.sheet, storage.codec, {
      startColumn: 3,
      storageCodec: storage.storageCodec,
    });

    table.append({ id: 3, name: "Katherine", status: "active" });
    table.updateAt(0, { id: 1, name: "Ada", status: "inactive" });

    expect(source.getRange).toHaveBeenNthCalledWith(1, 1, 3, 2, 2);
    expect(source.getRange).toHaveBeenNthCalledWith(2, 3, 3, 1, 2);
    expect(source.getRange).toHaveBeenNthCalledWith(3, 1, 3, 2, 2);
    expect(source.getRange).toHaveBeenNthCalledWith(4, 1, 3, 1, 2);
    expect(source.setValues).toHaveBeenNthCalledWith(1, [[3, '["Katherine","active"]']]);
    expect(source.setValues).toHaveBeenNthCalledWith(2, [[1, '["Ada","inactive"]']]);
  });

  test("reject a storage codec with a different logical width", () => {
    const source = createSheet([]);
    const codec = createSpreadsheetRowCodec(
      2,
      (values) => values,
      (values) => values,
    );

    expect(() =>
      createSpreadsheetTable(source.sheet, codec, {
        storageCodec: {
          logicalWidth: 1,
          physicalWidth: 1,
          locate: () => ({
            kind: "materialized",
            physicalIndex: 0,
          }),
          encode: (values) => values,
          decode: (values) => values,
        },
      }),
    ).toThrow("Spreadsheet table storage codec logical width 1 must match row codec width 2.");
  });

  test("reject invalid custom storage codec metadata", () => {
    const source = createSheet([]);
    const codec = createSpreadsheetRowCodec(
      2,
      (values) => values,
      (values) => values,
    );
    const baseStorageCodec = {
      logicalWidth: 2,
      encode: (values: readonly unknown[]) => values,
      decode: (values: readonly unknown[]) => values,
    };

    expect(() =>
      createSpreadsheetTable(source.sheet, codec, {
        storageCodec: {
          ...baseStorageCodec,
          physicalWidth: 0,
          locate: () => ({
            kind: "materialized",
            physicalIndex: 0,
          }),
        },
      }),
    ).toThrow("Spreadsheet table storage codec physical width must be a positive integer.");

    expect(() =>
      createSpreadsheetTable(source.sheet, codec, {
        storageCodec: {
          ...baseStorageCodec,
          physicalWidth: 2,
          locate: (logicalIndex) => ({
            kind: "materialized",
            physicalIndex: logicalIndex === 0 ? 0 : 2,
          }),
        },
      }),
    ).toThrow("Spreadsheet table storage codec physical index 2 must be between 0 and 1.");

    expect(() =>
      createSpreadsheetTable(source.sheet, codec, {
        storageCodec: {
          ...baseStorageCodec,
          physicalWidth: 2,
          locate: () =>
            ({
              kind: "unsupported",
              physicalIndex: 0,
            }) as unknown as SpreadsheetStorageLocation,
        },
      }),
    ).toThrow('Spreadsheet table storage codec location kind "unsupported" is not supported.');
  });

  test("snapshot custom storage codec locations", () => {
    const source = createSheet([[1, "Ada"]]);
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    let reversed = false;
    const table = createSpreadsheetTable(source.sheet, codec, {
      storageCodec: {
        logicalWidth: 2,
        physicalWidth: 2,
        locate: (logicalIndex) => ({
          kind: "materialized",
          physicalIndex: reversed ? 1 - logicalIndex : logicalIndex,
        }),
        encode: (values) => values,
        decode: (values) => values,
      },
    });

    reversed = true;

    expect(table.query(spreadsheetEq(id, 1))).toStrictEqual([{ id: 1, name: "Ada" }]);
  });

  test("validate custom storage codec result widths", () => {
    const source = createSheet([[1, "Ada"]]);
    const codec = createSpreadsheetRowCodec(
      2,
      (values) => values,
      (values) => values,
    );
    const createStorageCodec = (
      encode: (values: readonly unknown[]) => readonly unknown[],
      decode: (values: readonly unknown[]) => readonly unknown[],
    ) => ({
      logicalWidth: 2,
      physicalWidth: 2,
      locate: (logicalIndex: number) => ({
        kind: "materialized" as const,
        physicalIndex: logicalIndex,
      }),
      encode,
      decode,
    });
    const encodeTable = createSpreadsheetTable(source.sheet, codec, {
      storageCodec: createStorageCodec(
        () => [1],
        (values) => values,
      ),
    });
    const decodeTable = createSpreadsheetTable(source.sheet, codec, {
      storageCodec: createStorageCodec(
        (values) => values,
        (values) => [values[0]],
      ),
    });

    expect(() => encodeTable.append([2, "Grace"])).toThrow(
      "Spreadsheet table storage codec encode expected 2 physical values, received 1.",
    );
    expect(() => decodeTable.readAll()).toThrow(
      "Spreadsheet table storage codec decode expected 2 logical values, received 1.",
    );
  });

  test("reject invalid custom row codec metadata", () => {
    const source = createSheet([]);

    expect(() =>
      createSpreadsheetTable(source.sheet, {
        width: 0,
        decode: (values) => values,
        encode: (values) => values,
      }),
    ).toThrow("Spreadsheet table row codec width must be a positive integer.");
  });

  test("snapshot custom row codec width", () => {
    const source = createSheet([[1, "Ada"]]);
    let width = 2;
    const codec = {
      get width() {
        return width;
      },
      decode: (values: readonly unknown[]): UserRow => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      encode: (row: UserRow): readonly unknown[] => [row.id, row.name],
    };
    const name = createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name);
    const table = createSpreadsheetTable(source.sheet, codec);

    width = 1;

    expect(table.query(spreadsheetEq(name, "Ada"))).toStrictEqual([{ id: 1, name: "Ada" }]);
  });

  test("validate custom row codec encode widths", () => {
    const source = createSheet([]);
    const table = createSpreadsheetTable(source.sheet, {
      width: 2,
      decode: (values) => values,
      encode: (values: readonly unknown[]) => [values[0]],
    });

    expect(() => table.append([1, "Ada"])).toThrow(
      "Spreadsheet table row codec encode expected 2 values, received 1.",
    );
  });

  test("append an encoded row after the current table rows", () => {
    const source = createSheet(
      [
        [1, "Ada"],
        [2, "Grace"],
      ],
      3,
    );
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const table = createSpreadsheetTable(source.sheet, codec, {
      startRow: 2,
      startColumn: 3,
    });

    table.append({ id: 3, name: "Katherine" });

    expect(source.getLastRow).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledTimes(2);
    expect(source.getRange).toHaveBeenNthCalledWith(1, 2, 3, 2, 2);
    expect(source.getRange).toHaveBeenNthCalledWith(2, 4, 3, 1, 2);
    expect(source.setValues).toHaveBeenCalledOnce();
    expect(source.setValues).toHaveBeenCalledWith([[3, "Katherine"]]);
  });

  test("append at the configured start row when the table is empty", () => {
    const source = createSheet([], 1);
    const codec = createSpreadsheetRowCodec(
      2,
      (values) => values,
      (values) => values,
    );
    const table = createSpreadsheetTable(source.sheet, codec, {
      startRow: 2,
      startColumn: 3,
    });

    table.append([1, "Ada"]);

    expect(source.getRange).toHaveBeenCalledWith(2, 3, 1, 2);
    expect(source.setValues).toHaveBeenCalledWith([[1, "Ada"]]);
  });

  test("update an existing row by zero-based table index", () => {
    const source = createSheet(
      [
        [1, "Ada"],
        [2, "Grace"],
        [3, "Katherine"],
      ],
      4,
    );
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const table = createSpreadsheetTable(source.sheet, codec, {
      startRow: 2,
      startColumn: 3,
    });

    table.updateAt(1, { id: 2, name: "Hopper" });

    expect(source.getLastRow).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledTimes(2);
    expect(source.getRange).toHaveBeenNthCalledWith(1, 2, 3, 3, 2);
    expect(source.getRange).toHaveBeenNthCalledWith(2, 3, 3, 1, 2);
    expect(source.setValues).toHaveBeenCalledOnce();
    expect(source.setValues).toHaveBeenCalledWith([[2, "Hopper"]]);
  });

  test("delete a row by shifting only the table rectangle", () => {
    const source = createSheet(
      [
        [1, "Ada"],
        [2, "Grace"],
        [3, "Katherine"],
        ["", ""],
      ],
      4,
    );
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const table = createSpreadsheetTable(source.sheet, codec, {
      startColumn: 3,
    });
    source.getValues.mockReturnValueOnce([
      [2, "Grace"],
      [3, "Katherine"],
      ["", ""],
    ]);

    table.deleteAt(1);

    expect(source.getRange).toHaveBeenNthCalledWith(1, 2, 3, 3, 2);
    expect(source.getRange).toHaveBeenNthCalledWith(2, 2, 3, 2, 2);
    expect(source.setValues).toHaveBeenCalledWith([
      [3, "Katherine"],
      ["", ""],
    ]);
  });

  test("delete the last table row by clearing only its physical cells", () => {
    const source = createSheet(
      [
        [1, "Ada"],
        [2, "Grace"],
        ["", ""],
      ],
      4,
    );
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const table = createSpreadsheetTable(source.sheet, codec, {
      startRow: 2,
      startColumn: 3,
    });
    source.getValues.mockReturnValueOnce([
      [2, "Grace"],
      ["", ""],
    ]);

    table.deleteAt(1);

    expect(source.getRange).toHaveBeenNthCalledWith(1, 3, 3, 2, 2);
    expect(source.getRange).toHaveBeenNthCalledWith(2, 3, 3, 1, 2);
    expect(source.setValues).toHaveBeenCalledWith([["", ""]]);
  });

  test("delete packed rows without decoding or re-encoding payloads", () => {
    const source = createSheet([
      [1, '["Ada","active"]'],
      [2, '["Grace","inactive"]'],
      [3, '["Katherine","active"]'],
    ]);
    const storage = createPackedUserStorage();
    const table = createSpreadsheetTable(source.sheet, storage.codec, {
      storageCodec: storage.storageCodec,
    });

    table.deleteAt(0);

    expect(source.getRange).toHaveBeenNthCalledWith(2, 1, 1, 3, 2);
    expect(source.setValues).toHaveBeenCalledWith([
      [2, '["Grace","inactive"]'],
      [3, '["Katherine","active"]'],
      ["", ""],
    ]);
  });

  test.each([-1, 1.5, Number.NaN])("reject invalid row index: %s", (index) => {
    const source = createSheet([], 3);
    const codec = createSpreadsheetRowCodec(
      1,
      (values) => values,
      (values) => values,
    );
    const table = createSpreadsheetTable(source.sheet, codec);

    expect(() => table.updateAt(index, ["value"])).toThrow(
      "Spreadsheet table row index must be a non-negative integer.",
    );
    expect(() => table.deleteAt(index)).toThrow(
      "Spreadsheet table row index must be a non-negative integer.",
    );
    expect(source.getLastRow).not.toHaveBeenCalled();
    expect(source.getRange).not.toHaveBeenCalled();
  });

  test("reject update past the current table rows", () => {
    const source = createSheet([], 2);
    const codec = createSpreadsheetRowCodec(
      1,
      (values) => values,
      (values) => values,
    );
    const table = createSpreadsheetTable(source.sheet, codec, {
      startRow: 2,
    });

    expect(() => table.updateAt(1, ["value"])).toThrow(
      "Spreadsheet table row index 1 is out of range.",
    );
    expect(source.getLastRow).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledWith(2, 1, 1, 1);
    expect(source.getValues).toHaveBeenCalledOnce();
    expect(source.setValues).not.toHaveBeenCalled();
  });

  test("ignore trailing empty table rows when other sheet data extends lower", () => {
    const source = createSheet(
      [
        [1, "Ada"],
        [2, "Grace"],
        ["", ""],
        ["", ""],
      ],
      4,
    );
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const table = createSpreadsheetTable(source.sheet, codec);

    expect(table.readAll()).toStrictEqual([
      { id: 1, name: "Ada" },
      { id: 2, name: "Grace" },
    ]);
    expect(source.getRange).toHaveBeenCalledWith(1, 1, 4, 2);
  });

  test("append after the last table row instead of the sheet last row", () => {
    const source = createSheet(
      [
        [1, "Ada"],
        [2, "Grace"],
        ["", ""],
        ["", ""],
      ],
      5,
    );
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const table = createSpreadsheetTable(source.sheet, codec, {
      startRow: 2,
      startColumn: 3,
    });

    table.append({ id: 3, name: "Katherine" });

    expect(source.getRange).toHaveBeenNthCalledWith(1, 2, 3, 4, 2);
    expect(source.getRange).toHaveBeenNthCalledWith(2, 4, 3, 1, 2);
    expect(source.setValues).toHaveBeenCalledWith([[3, "Katherine"]]);
  });

  test("reject updates past the table boundary even when the sheet extends lower", () => {
    const source = createSheet([[1], [""], [""]], 3);
    const codec = createSpreadsheetRowCodec(
      1,
      (values) => values,
      (values) => values,
    );
    const table = createSpreadsheetTable(source.sheet, codec);

    expect(() => table.updateAt(1, ["value"])).toThrow(
      "Spreadsheet table row index 1 is out of range.",
    );
    expect(source.getRange).toHaveBeenCalledOnce();
    expect(source.setValues).not.toHaveBeenCalled();
  });

  test("reject deletes past the table boundary even when the sheet extends lower", () => {
    const source = createSheet([[1], [""], [""]], 3);
    const codec = createSpreadsheetRowCodec(
      1,
      (values) => values,
      (values) => values,
    );
    const table = createSpreadsheetTable(source.sheet, codec);
    source.getValues.mockReturnValueOnce([[""], [""]]);

    expect(() => table.deleteAt(1)).toThrow("Spreadsheet table row index 1 is out of range.");
    expect(source.getRange).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledWith(2, 1, 2, 1);
    expect(source.setValues).not.toHaveBeenCalled();
  });

  test("return no rows without requesting a range when the table is empty", () => {
    const source = createSheet([], 1);
    const codec = createSpreadsheetRowCodec(
      2,
      (values) => values,
      (values) => values,
    );
    const table = createSpreadsheetTable(source.sheet, codec, {
      startRow: 2,
    });

    expect(table.readAll()).toStrictEqual([]);
    expect(source.getLastRow).toHaveBeenCalledOnce();
    expect(source.getRange).not.toHaveBeenCalled();
    expect(source.getValues).not.toHaveBeenCalled();
  });

  test.each([
    ["startRow", 0],
    ["startRow", -1],
    ["startRow", 1.5],
    ["startColumn", 0],
    ["startColumn", -1],
    ["startColumn", 1.5],
  ] as const)("reject invalid %s: %s", (name, value) => {
    const source = createSheet([]);
    const codec = createSpreadsheetRowCodec(
      1,
      (values) => values,
      (values) => values,
    );

    expect(() =>
      createSpreadsheetTable(source.sheet, codec, {
        [name]: value,
      }),
    ).toThrow(`Spreadsheet table ${name} must be a positive integer.`);
  });
});
