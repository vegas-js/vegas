import { describe, expect, test, vi } from "vitest";

import {
  createSpreadsheetColumn,
  createSpreadsheetRepository,
  createSpreadsheetRowCodec,
  createSpreadsheetTable,
  SpreadsheetRepositoryKeyConflictError,
} from "../server";

interface UserRow {
  readonly id: number;
  readonly name: string;
}

function createSheet(values: unknown[][], lastRow = values.length) {
  const getRange = vi.fn((row: number, column: number, numRows: number, numColumns: number) => ({
    getValues(): unknown[][] {
      return values
        .slice(row - 1, row - 1 + numRows)
        .map((sourceRow) => sourceRow.slice(column - 1, column - 1 + numColumns));
    },
    setValues: vi.fn(),
  }));
  const getLastRow = vi.fn(() => lastRow);
  const sheet = {
    getLastRow,
    getRange,
  } as unknown as GoogleAppsScript.Spreadsheet.Sheet;

  return {
    sheet,
    getLastRow,
    getRange,
  };
}

function createUserRepository(source: ReturnType<typeof createSheet>) {
  const codec = createSpreadsheetRowCodec<UserRow>(
    2,
    (values) => ({
      id: Number(values[0]),
      name: String(values[1]),
    }),
    (row) => [row.id, row.name],
  );
  const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
  const table = createSpreadsheetTable(source.sheet, codec);

  return createSpreadsheetRepository(table, id);
}

describe("spreadsheet repository physical key lookup", () => {
  test("read the materialized key column before reading only the matching row", () => {
    const source = createSheet([
      [1, "Ada"],
      [2, "Grace"],
      [3, "Katherine"],
    ]);
    const repository = createUserRepository(source);

    expect(repository.findByKey(2)).toStrictEqual({ id: 2, name: "Grace" });
    expect(source.getLastRow).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledTimes(2);
    expect(source.getRange).toHaveBeenNthCalledWith(1, 1, 1, 3, 1);
    expect(source.getRange).toHaveBeenNthCalledWith(2, 2, 1, 1, 2);
  });

  test("not read full row data when the materialized key is missing", () => {
    const source = createSheet([
      [1, "Ada"],
      [2, "Grace"],
      [3, "Katherine"],
    ]);
    const repository = createUserRepository(source);

    expect(repository.findByKey(4)).toBeUndefined();
    expect(source.getRange).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledWith(1, 1, 3, 1);
  });

  test("report a duplicate key without reading matching row data", () => {
    const source = createSheet([
      [1, "Ada"],
      [2, "Grace"],
      [2, "Hopper"],
      [2, "Third"],
    ]);
    const repository = createUserRepository(source);

    expect(() => repository.findByKey(2)).toThrow(SpreadsheetRepositoryKeyConflictError);
    expect(source.getRange).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledWith(1, 1, 4, 1);
  });

  test("check duplicate keys without reading matching row data", () => {
    const source = createSheet([
      [1, "Ada"],
      [2, "Grace"],
      [3, "Katherine"],
    ]);
    const repository = createUserRepository(source);

    expect(() => repository.insert({ id: 2, name: "Hopper" })).toThrow(
      SpreadsheetRepositoryKeyConflictError,
    );
    expect(source.getRange).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledWith(1, 1, 3, 1);
  });

  test("update a found row without reading matching row data", () => {
    const source = createSheet([
      [1, "Ada"],
      [2, "Grace"],
      [3, "Katherine"],
    ]);
    const repository = createUserRepository(source);

    expect(repository.updateByKey(2, { id: 2, name: "Hopper" })).toBe(true);
    expect(source.getLastRow).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledTimes(2);
    expect(source.getRange).toHaveBeenNthCalledWith(1, 1, 1, 3, 1);
    expect(source.getRange).toHaveBeenNthCalledWith(2, 2, 1, 1, 2);
  });

  test("delete a found row without rereading rows before it", () => {
    const source = createSheet([
      [1, "Ada"],
      [2, "Grace"],
      [3, "Katherine"],
      [4, "Margaret"],
    ]);
    const repository = createUserRepository(source);

    expect(repository.deleteByKey(3)).toBe(true);
    expect(source.getLastRow).toHaveBeenCalledTimes(2);
    expect(source.getRange).toHaveBeenCalledTimes(3);
    expect(source.getRange).toHaveBeenNthCalledWith(1, 1, 1, 4, 1);
    expect(source.getRange).toHaveBeenNthCalledWith(2, 3, 1, 2, 2);
    expect(source.getRange).toHaveBeenNthCalledWith(3, 3, 1, 2, 2);
  });

  test("fall back to the full table read for an empty-string key", () => {
    interface StringKeyRow {
      readonly id: string;
      readonly name: string;
    }

    const source = createSheet(
      [
        ["a", "Ada"],
        ["", "Blank"],
        ["", ""],
      ],
      3,
    );
    const codec = createSpreadsheetRowCodec<StringKeyRow>(
      2,
      (values) => ({
        id: String(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const id = createSpreadsheetColumn<StringKeyRow, string>("id", 0, (row) => row.id);
    const table = createSpreadsheetTable(source.sheet, codec);
    const repository = createSpreadsheetRepository(table, id);

    expect(repository.findByKey("")).toStrictEqual({ id: "", name: "Blank" });
    expect(source.getRange).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledWith(1, 1, 3, 2);
  });
});
