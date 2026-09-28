import { describe, expect, expectTypeOf, test, vi } from "vitest";

import {
  createSpreadsheetRepository,
  type SpreadsheetRepository,
  type SpreadsheetTable,
} from "../server";

interface UserRow {
  readonly id: number;
  readonly name: string;
}

function createTable(rows: UserRow[]) {
  const readAll = vi.fn(() => rows);
  const append = vi.fn();
  const updateAt = vi.fn();
  const table: SpreadsheetTable<UserRow> = {
    readAll,
    append,
    updateAt,
  };

  return {
    table,
    readAll,
    append,
    updateAt,
  };
}

describe("createSpreadsheetRepository", () => {
  test("find a row by key", () => {
    const source = createTable([
      { id: 1, name: "Ada" },
      { id: 2, name: "Grace" },
    ]);
    const repository = createSpreadsheetRepository(source.table, (row) => row.id);

    expectTypeOf(repository).toEqualTypeOf<SpreadsheetRepository<UserRow, number>>();
    expect(repository.findByKey(2)).toStrictEqual({
      id: 2,
      name: "Grace",
    });
    expect(repository.findByKey(3)).toBeUndefined();
    expect(source.readAll).toHaveBeenCalledTimes(2);
  });

  test("insert a row through the table", () => {
    const source = createTable([]);
    const repository = createSpreadsheetRepository(source.table, (row) => row.id);
    const row = { id: 1, name: "Ada" };

    repository.insert(row);

    expect(source.append).toHaveBeenCalledOnce();
    expect(source.append).toHaveBeenCalledWith(row);
    expect(source.readAll).not.toHaveBeenCalled();
    expect(source.updateAt).not.toHaveBeenCalled();
  });

  test("update a row by key", () => {
    const source = createTable([
      { id: 1, name: "Ada" },
      { id: 2, name: "Grace" },
    ]);
    const repository = createSpreadsheetRepository(source.table, (row) => row.id);
    const row = { id: 2, name: "Hopper" };

    expect(repository.updateByKey(2, row)).toBe(true);
    expect(source.readAll).toHaveBeenCalledOnce();
    expect(source.updateAt).toHaveBeenCalledOnce();
    expect(source.updateAt).toHaveBeenCalledWith(1, row);
  });

  test("return false without writing when an update key is missing", () => {
    const source = createTable([{ id: 1, name: "Ada" }]);
    const repository = createSpreadsheetRepository(source.table, (row) => row.id);

    expect(repository.updateByKey(2, { id: 2, name: "Grace" })).toBe(false);
    expect(source.readAll).toHaveBeenCalledOnce();
    expect(source.updateAt).not.toHaveBeenCalled();
  });
});
