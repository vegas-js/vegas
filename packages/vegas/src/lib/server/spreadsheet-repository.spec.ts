import { describe, expect, expectTypeOf, test, vi } from "vitest";

import {
  createSpreadsheetRepository,
  SpreadsheetRepositoryKeyConflictError,
  type SpreadsheetRepository,
  type SpreadsheetRepositoryMutationGuard,
} from "./spreadsheet-repository";
import { createSpreadsheetColumn } from "./spreadsheet-schema";
import type { SpreadsheetTable } from "./spreadsheet-table";

interface UserRow {
  readonly id: number;
  readonly name: string;
}

function createTable(rows: UserRow[]) {
  const readAll = vi.fn(() => rows);
  const query = vi.fn();
  const execute = vi.fn();
  const executeEntries = vi.fn();
  const append = vi.fn();
  const updateAt = vi.fn();
  const deleteAt = vi.fn();
  const table: SpreadsheetTable<UserRow> = {
    readAll,
    query,
    execute,
    executeEntries,
    append,
    updateAt,
    deleteAt,
  };

  return {
    table,
    readAll,
    query,
    execute,
    executeEntries,
    append,
    updateAt,
    deleteAt,
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

    expect(source.readAll).toHaveBeenCalledOnce();
    expect(source.append).toHaveBeenCalledOnce();
    expect(source.append).toHaveBeenCalledWith(row);
    expect(source.updateAt).not.toHaveBeenCalled();
  });

  test("guard the complete insert mutation", () => {
    const events: string[] = [];
    const source = createTable([]);
    source.readAll.mockImplementation(() => {
      events.push("read");
      return [];
    });
    source.append.mockImplementation(() => {
      events.push("append");
    });
    const mutationGuard: SpreadsheetRepositoryMutationGuard = {
      runExclusive<Result>(mutation: () => Result): Result {
        events.push("enter");

        try {
          return mutation();
        } finally {
          events.push("leave");
        }
      },
    };
    const repository = createSpreadsheetRepository(source.table, (row) => row.id, {
      mutationGuard,
    });

    repository.insert({ id: 1, name: "Ada" });

    expect(events).toStrictEqual(["enter", "read", "append", "leave"]);
  });

  test("guard update and delete mutations but not reads", () => {
    const source = createTable([
      { id: 1, name: "Ada" },
      { id: 2, name: "Grace" },
    ]);
    let mutationCount = 0;
    const mutationGuard: SpreadsheetRepositoryMutationGuard = {
      runExclusive<Result>(mutation: () => Result): Result {
        mutationCount += 1;
        return mutation();
      },
    };
    const repository = createSpreadsheetRepository(source.table, (row) => row.id, {
      mutationGuard,
    });

    expect(repository.findByKey(1)).toStrictEqual({ id: 1, name: "Ada" });
    expect(mutationCount).toBe(0);

    expect(repository.updateByKey(2, { id: 2, name: "Hopper" })).toBe(true);
    expect(repository.deleteByKey(2)).toBe(true);
    expect(mutationCount).toBe(2);
  });

  test("reject inserting a duplicate key", () => {
    const source = createTable([{ id: 1, name: "Ada" }]);
    const repository = createSpreadsheetRepository(source.table, (row) => row.id);

    expect(() => repository.insert({ id: 1, name: "Grace" })).toThrow(
      SpreadsheetRepositoryKeyConflictError,
    );
    expect(source.readAll).toHaveBeenCalledOnce();
    expect(source.append).not.toHaveBeenCalled();
  });

  test("reject an ambiguous duplicate key lookup", () => {
    const source = createTable([
      { id: 1, name: "Ada" },
      { id: 1, name: "Grace" },
    ]);
    const repository = createSpreadsheetRepository(source.table, (row) => row.id);

    expect(() => repository.findByKey(1)).toThrow(SpreadsheetRepositoryKeyConflictError);
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

  test("reject updating a row to an existing key", () => {
    const source = createTable([
      { id: 1, name: "Ada" },
      { id: 2, name: "Grace" },
    ]);
    const repository = createSpreadsheetRepository(source.table, (row) => row.id);

    expect(() => repository.updateByKey(1, { id: 2, name: "Ada" })).toThrow(
      SpreadsheetRepositoryKeyConflictError,
    );
    expect(source.updateAt).not.toHaveBeenCalled();
  });

  test("reject updating an ambiguous duplicate key", () => {
    const source = createTable([
      { id: 1, name: "Ada" },
      { id: 1, name: "Grace" },
    ]);
    const repository = createSpreadsheetRepository(source.table, (row) => row.id);

    expect(() => repository.updateByKey(1, { id: 1, name: "Hopper" })).toThrow(
      SpreadsheetRepositoryKeyConflictError,
    );
    expect(source.updateAt).not.toHaveBeenCalled();
  });

  test("return false without writing when an update key is missing", () => {
    const source = createTable([{ id: 1, name: "Ada" }]);
    const repository = createSpreadsheetRepository(source.table, (row) => row.id);

    expect(repository.updateByKey(2, { id: 2, name: "Grace" })).toBe(false);
    expect(source.readAll).toHaveBeenCalledOnce();
    expect(source.updateAt).not.toHaveBeenCalled();
  });

  test("delete a row by key", () => {
    const source = createTable([
      { id: 1, name: "Ada" },
      { id: 2, name: "Grace" },
    ]);
    const repository = createSpreadsheetRepository(source.table, (row) => row.id);

    expect(repository.deleteByKey(2)).toBe(true);
    expect(source.readAll).toHaveBeenCalledOnce();
    expect(source.deleteAt).toHaveBeenCalledOnce();
    expect(source.deleteAt).toHaveBeenCalledWith(1);
  });

  test("reject deleting an ambiguous duplicate key", () => {
    const source = createTable([
      { id: 1, name: "Ada" },
      { id: 1, name: "Grace" },
    ]);
    const repository = createSpreadsheetRepository(source.table, (row) => row.id);

    expect(() => repository.deleteByKey(1)).toThrow(SpreadsheetRepositoryKeyConflictError);
    expect(source.deleteAt).not.toHaveBeenCalled();
  });

  test("use query entries when a key column is provided", () => {
    const source = createTable([]);
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const repository = createSpreadsheetRepository(source.table, id);

    source.executeEntries
      .mockReturnValueOnce([
        {
          index: 4,
          row: { id: 2, name: "Grace" },
        },
      ])
      .mockReturnValueOnce([]);

    expect(repository.findByKey(2)).toStrictEqual({
      id: 2,
      name: "Grace",
    });
    expect(repository.findByKey(3)).toBeUndefined();
    expect(source.readAll).not.toHaveBeenCalled();
    expect(source.executeEntries).toHaveBeenNthCalledWith(1, {
      where: {
        kind: "equal",
        column: 0,
        value: 2,
      },
      orderBy: [],
      limit: 2,
    });
  });

  test("update by the source table index when a key column is provided", () => {
    const source = createTable([]);
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const repository = createSpreadsheetRepository(source.table, id);
    const row = { id: 2, name: "Hopper" };

    source.executeEntries.mockReturnValueOnce([
      {
        index: 7,
        row: { id: 2, name: "Grace" },
      },
    ]);

    expect(repository.updateByKey(2, row)).toBe(true);
    expect(source.readAll).not.toHaveBeenCalled();
    expect(source.updateAt).toHaveBeenCalledWith(7, row);
  });

  test("reject duplicate key query entries", () => {
    const source = createTable([]);
    const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
    const repository = createSpreadsheetRepository(source.table, id);

    source.executeEntries.mockReturnValueOnce([
      {
        index: 1,
        row: { id: 2, name: "Grace" },
      },
      {
        index: 5,
        row: { id: 2, name: "Hopper" },
      },
    ]);

    expect(() => repository.findByKey(2)).toThrow(SpreadsheetRepositoryKeyConflictError);
  });

  test("return false without writing when a delete key is missing", () => {
    const source = createTable([{ id: 1, name: "Ada" }]);
    const repository = createSpreadsheetRepository(source.table, (row) => row.id);

    expect(repository.deleteByKey(2)).toBe(false);
    expect(source.readAll).toHaveBeenCalledOnce();
    expect(source.deleteAt).not.toHaveBeenCalled();
  });
});
