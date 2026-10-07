import { spreadsheetEq } from "../query/expression";
import type { SpreadsheetColumn } from "../schema";
import {
  tryFindSpreadsheetTableIndicesByMaterializedColumn,
  tryHasSpreadsheetTableSchemaColumn,
  tryReadSpreadsheetTableEntryAtKnownIndex,
  tryUpdateSpreadsheetTableAtKnownIndex,
  type SpreadsheetTable,
  type SpreadsheetTableEntry,
} from "../table";

export class SpreadsheetRepositoryKeyConflictError extends Error {
  constructor() {
    super("Spreadsheet repository key must be unique.");
    this.name = "SpreadsheetRepositoryKeyConflictError";
  }
}

export interface SpreadsheetRepository<Row, Key> {
  findByKey(key: Key): Row | undefined;
  insert(row: Row): void;
  updateByKey(key: Key, row: Row): boolean;
  deleteByKey(key: Key): boolean;
}

export interface SpreadsheetRepositoryMutationGuard {
  runExclusive<Result>(mutation: () => Result): Result;
}

export interface SpreadsheetRepositoryOptions {
  readonly mutationGuard?: SpreadsheetRepositoryMutationGuard;
}

function findUniqueRowEntry<Row, Key>(
  rows: readonly Row[],
  key: Key,
  getKey: (row: Row) => Key,
): SpreadsheetTableEntry<Row> | undefined {
  let entry: SpreadsheetTableEntry<Row> | undefined;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    if (row === undefined || !Object.is(getKey(row), key)) {
      continue;
    }

    if (entry !== undefined) {
      throw new SpreadsheetRepositoryKeyConflictError();
    }

    entry = {
      index,
      row,
    };
  }

  return entry;
}

function requireAvailableRowKey<Row, Key>(
  rows: readonly Row[],
  key: Key,
  getKey: (row: Row) => Key,
  excludedIndex = -1,
): void {
  for (let index = 0; index < rows.length; index += 1) {
    if (index === excludedIndex) {
      continue;
    }

    const row = rows[index];

    if (row !== undefined && Object.is(getKey(row), key)) {
      throw new SpreadsheetRepositoryKeyConflictError();
    }
  }
}

function findUniqueColumnEntry<Row, Key>(
  table: SpreadsheetTable<Row>,
  column: SpreadsheetColumn<Row, Key>,
  key: Key,
): SpreadsheetTableEntry<Row> | undefined {
  const indices = tryFindSpreadsheetTableIndicesByMaterializedColumn(table, column.index, key, 2);

  if (indices !== undefined) {
    if (indices.length > 1) {
      throw new SpreadsheetRepositoryKeyConflictError();
    }

    const index = indices[0];

    if (index === undefined) {
      return undefined;
    }

    const entry = tryReadSpreadsheetTableEntryAtKnownIndex(table, index);

    if (entry !== undefined) {
      return entry;
    }
  }

  const entries = table.executeEntries({
    where: spreadsheetEq(column, key),
    orderBy: [],
    limit: 2,
  });

  if (entries.length > 1) {
    throw new SpreadsheetRepositoryKeyConflictError();
  }

  return entries[0];
}

function findUniqueColumnIndex<Row, Key>(
  table: SpreadsheetTable<Row>,
  column: SpreadsheetColumn<Row, Key>,
  key: Key,
): number | undefined {
  const indices = tryFindSpreadsheetTableIndicesByMaterializedColumn(table, column.index, key, 2);

  if (indices === undefined) {
    return findUniqueColumnEntry(table, column, key)?.index;
  }

  if (indices.length > 1) {
    throw new SpreadsheetRepositoryKeyConflictError();
  }

  return indices[0];
}

export function createSpreadsheetRepository<Row, Key>(
  table: SpreadsheetTable<Row>,
  keyColumn: SpreadsheetColumn<Row, Key>,
  options?: SpreadsheetRepositoryOptions,
): SpreadsheetRepository<Row, Key>;
export function createSpreadsheetRepository<Row, Key>(
  table: SpreadsheetTable<Row>,
  getKey: (row: Row) => Key,
  options?: SpreadsheetRepositoryOptions,
): SpreadsheetRepository<Row, Key>;
export function createSpreadsheetRepository<Row, Key>(
  table: SpreadsheetTable<Row>,
  keySource: SpreadsheetColumn<Row, Key> | ((row: Row) => Key),
  options: SpreadsheetRepositoryOptions = {},
): SpreadsheetRepository<Row, Key> {
  const keyColumn = typeof keySource === "function" ? undefined : keySource;

  if (keyColumn !== undefined) {
    const belongsToSchema = tryHasSpreadsheetTableSchemaColumn(table, keyColumn);

    if (belongsToSchema === false) {
      throw new RangeError(
        `Spreadsheet repository key column "${keyColumn.name}" must belong to the table schema.`,
      );
    }
  }

  const getKey =
    typeof keySource === "function" ? keySource : (row: Row): Key => keySource.getValue(row);

  function runMutation<Result>(mutation: () => Result): Result {
    if (options.mutationGuard === undefined) {
      return mutation();
    }

    return options.mutationGuard.runExclusive(mutation);
  }

  function findEntry(key: Key): SpreadsheetTableEntry<Row> | undefined {
    if (keyColumn !== undefined) {
      return findUniqueColumnEntry(table, keyColumn, key);
    }

    return findUniqueRowEntry(table.readAll(), key, getKey);
  }

  function findIndex(key: Key): number | undefined {
    if (keyColumn !== undefined) {
      return findUniqueColumnIndex(table, keyColumn, key);
    }

    return findEntry(key)?.index;
  }

  function requireAvailableKey(key: Key, excludedIndex = -1): void {
    if (keyColumn !== undefined) {
      if (findUniqueColumnIndex(table, keyColumn, key) !== undefined) {
        throw new SpreadsheetRepositoryKeyConflictError();
      }

      return;
    }

    requireAvailableRowKey(table.readAll(), key, getKey, excludedIndex);
  }

  return {
    findByKey(key): Row | undefined {
      return findEntry(key)?.row;
    },

    insert(row): void {
      runMutation(() => {
        requireAvailableKey(getKey(row));
        table.append(row);
      });
    },

    updateByKey(key, row): boolean {
      return runMutation(() => {
        const index = findIndex(key);

        if (index === undefined) {
          return false;
        }

        const nextKey = getKey(row);

        if (!Object.is(nextKey, key)) {
          requireAvailableKey(nextKey);
        }

        if (!tryUpdateSpreadsheetTableAtKnownIndex(table, index, row)) {
          table.updateAt(index, row);
        }

        return true;
      });
    },

    deleteByKey(key): boolean {
      return runMutation(() => {
        const index = findIndex(key);

        if (index === undefined) {
          return false;
        }

        table.deleteAt(index);
        return true;
      });
    },
  };
}
